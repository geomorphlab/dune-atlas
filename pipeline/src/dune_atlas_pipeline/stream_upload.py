"""Build the release stores and stream them to object storage, keeping little on local disk.

Used when there is no large local staging disk. Peak local usage: one 64-row band of cell-store
shards (~0.5-1.5 GB) or one field-pyramid store (~0.3 GB), plus the small static arrays.

    # R2 (S3 API). Credentials from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, account from R2_ACCOUNT_ID.
    python -m dune_atlas_pipeline.stream_upload --version v1 --work staging/stream --what cells fields dunes
    # dry run into a local directory that mimics the bucket
    python -m dune_atlas_pipeline.stream_upload --version v1 --work staging/stream --target local:staging/fake-bucket

Remote layout: <bucket>/dune-atlas/<version>/{cells.zarr/..., fields/<var>.zarr/..., dunes/*.pmtiles}.
Resumable: every uploaded object is recorded in <work>/uploaded-<version>.json (atomic rewrite); a local file
is deleted only after the remote object's size has been verified. Published versions are immutable:
starting a fresh upload into a non-empty prefix is refused unless --force.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

CACHE_CONTROL = "public, max-age=86400, s-maxage=2592000, immutable"
JUNK = (".DS_Store",)


def _ctype(name: str) -> str:
    if name.endswith(".json"):
        return "application/json"
    return "application/octet-stream"


# ----------------------------------------------------------------------------- targets
class LocalTarget:
    """Directory standing in for a bucket (tests / dry runs)."""

    def __init__(self, root):
        self.root = Path(root)

    def put(self, key: str, path: Path):
        dst = self.root / key
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, dst)

    def put_new(self, key: str, path: Path):
        """Create-only put: raises FileExistsError if the key exists."""
        dst = self.root / key
        if dst.exists():
            raise FileExistsError(key)
        self.put(key, path)

    def size(self, key: str):
        p = self.root / key
        return p.stat().st_size if p.exists() else None

    def any_under(self, prefix: str) -> bool:
        p = self.root / prefix
        return p.exists() and any(p.rglob("*"))

    def list_keys(self, prefix: str) -> dict:
        p = self.root / prefix
        if not p.exists():
            return {}
        return {f.relative_to(self.root).as_posix(): f.stat().st_size for f in p.rglob("*") if f.is_file()}


class R2Target:
    """Cloudflare R2 via the S3 API (boto3)."""

    def __init__(self, bucket: str, account_id: str):
        import boto3
        from botocore.config import Config
        self.bucket = bucket
        self.s3 = boto3.client(
            "s3", endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com", region_name="auto",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            config=Config(retries={"max_attempts": 8, "mode": "adaptive"}, max_pool_connections=32))

    def put(self, key: str, path: Path):
        self.s3.upload_file(str(path), self.bucket, key, ExtraArgs={
            "ContentType": _ctype(path.name), "CacheControl": CACHE_CONTROL})

    def put_new(self, key: str, path: Path):
        """Create-only put (S3 conditional write `If-None-Match: *`, supported by R2): never overwrites.
        Raises FileExistsError if the key already exists (HTTP 412)."""
        with open(path, "rb") as f:
            try:
                self.s3.put_object(Bucket=self.bucket, Key=key, Body=f, IfNoneMatch="*",
                                   ContentType=_ctype(path.name), CacheControl=CACHE_CONTROL)
            except self.s3.exceptions.ClientError as e:
                if e.response.get("Error", {}).get("Code") in ("PreconditionFailed", "412") or \
                        e.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 412:
                    raise FileExistsError(key) from e
                raise

    def size(self, key: str):
        try:
            return self.s3.head_object(Bucket=self.bucket, Key=key)["ContentLength"]
        except self.s3.exceptions.ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return None
            raise

    def any_under(self, prefix: str) -> bool:
        r = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=prefix.rstrip("/") + "/", MaxKeys=1)
        return r.get("KeyCount", 0) > 0

    def list_keys(self, prefix: str) -> dict:
        """{key: size} of every object under prefix (paginated live listing)."""
        out = {}
        for page in self.s3.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=prefix):
            for o in page.get("Contents", []):
                out[o["Key"]] = o["Size"]
        return out


def make_target(spec: str):
    if spec.startswith("local:"):
        return LocalTarget(spec[len("local:"):])
    if spec == "r2":
        return R2Target(os.environ.get("R2_BUCKET", "dune-atlas-data"), os.environ["R2_ACCOUNT_ID"])
    raise ValueError(spec)


# ----------------------------------------------------------------------------- upload ledger
class Ledger:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.d = json.loads(self.path.read_text()) if self.path.exists() else {"objects": {}, "done": []}

    def has(self, key):
        return key in self.d["objects"]

    def add(self, key, size):
        self.d["objects"][key] = size

    def mark(self, tag):
        if tag not in self.d["done"]:
            self.d["done"].append(tag)

    def is_done(self, tag):
        return tag in self.d["done"]

    def save(self):
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.d))
        with open(tmp, "rb+") as f:
            os.fsync(f.fileno())
        os.replace(tmp, self.path)


def _upload_file(target, ledger: Ledger, key: str, path: Path, delete: bool, log, overwrite=False):
    """Upload one file, verify remote size, record, optionally delete local. Returns bytes sent."""
    size = path.stat().st_size
    if ledger.has(key) and not overwrite:
        if delete:
            path.unlink(missing_ok=True)
        return 0
    for attempt in range(5):
        try:
            target.put(key, path)
            got = target.size(key)
            if got != size:
                raise IOError(f"size mismatch for {key}: local {size} remote {got}")
            break
        except Exception as e:  # noqa: BLE001 - retry anything, re-raise at the end
            if attempt == 4:
                raise
            log(f"retry {attempt + 1} for {key}: {e}")
            time.sleep(2 ** attempt)
    ledger.add(key, size)
    if delete:
        path.unlink()
    return size


UPLOAD_THREADS = int(os.environ.get("UPLOAD_THREADS", "24"))


def _upload_tree(target, ledger, local_root: Path, key_prefix: str, delete: bool, log,
                 only=None, overwrite=False, threads=None):
    """Upload every file under local_root concurrently (per-object latency dominates for small objects).
    Each file is verified before it is recorded / deleted (see _upload_file); the ledger dict is only
    mutated for distinct keys, and saved by the caller."""
    from concurrent.futures import ThreadPoolExecutor
    files = []
    for p in sorted(local_root.rglob("*")):
        if not p.is_file() or p.name.startswith("._") or p.name in JUNK:
            continue
        rel = p.relative_to(local_root).as_posix()
        if only is not None and not only(rel):
            continue
        files.append((f"{key_prefix}/{rel}", p))
    if not files:
        return 0, 0
    with ThreadPoolExecutor(max_workers=threads or UPLOAD_THREADS) as ex:
        sizes = list(ex.map(lambda kp: _upload_file(target, ledger, kp[0], kp[1], delete, log,
                                                    overwrite=overwrite), files))
    return len(files), sum(sizes)


def _free_gb(path):
    st = os.statvfs(path)
    return st.f_bavail * st.f_frsize / 1e9


# ----------------------------------------------------------------------------- stages
def stream_cells(target, ledger, work: Path, prefix: str, data_dir: str, workers=4, band=64,
                 rows=None, log=print, min_free_gb=4.0, dataset=None):
    """Cell store, one band of `band` rows at a time. Shard files (…/c/<i>/<j>/0/0) are uploaded and
    deleted after each band; metadata and the small static arrays are uploaded (overwriting) at the end."""
    from . import cellstore
    from .grid import get_dataset
    out = work / "cells.zarr"
    y_start, y_stop = rows if rows else (0, get_dataset(dataset).grid.ny)
    is_shard = lambda rel: rel.startswith(("hist/c/", "fields/c/"))  # noqa: E731
    for y0 in range(y_start - y_start % band, y_stop, band):
        tag = f"cells-band-{y0}"
        if ledger.is_done(tag):
            continue
        if _free_gb(work) < min_free_gb:
            raise RuntimeError(f"less than {min_free_gb} GB free in {work}")
        t0 = time.time()
        cellstore.write_region(str(out), data_dir, y0, min(y0 + band, y_stop), 0, None, workers=workers,
                               log=lambda s: None, dataset=dataset)
        n, sent = _upload_tree(target, ledger, out, f"{prefix}/cells.zarr", True, log, only=is_shard)
        ledger.mark(tag); ledger.save()
        log(f"cells rows {y0}-{min(y0 + band, y_stop)}: {n} shard objects, {sent / 1e6:.1f} MB, {time.time() - t0:.0f} s")
    # metadata + land/dunes (small, rewritten whenever the store is reopened) - always overwrite
    n, sent = _upload_tree(target, ledger, out, f"{prefix}/cells.zarr", False, log,
                           only=lambda rel: not is_shard(rel), overwrite=True)
    ledger.mark("cells-meta"); ledger.save()
    log(f"cells metadata/static arrays: {n} objects, {sent / 1e6:.1f} MB")


def stream_fields(target, ledger, work: Path, prefix: str, data_dir: str, vars_=None, log=print):
    """Field pyramids, one variable at a time (subprocess keeps peak RSS ~4.7 GB): build, upload, delete."""
    from .cellstore import FIELD_VARS
    fdir = work / "fields"
    fdir.mkdir(parents=True, exist_ok=True)
    for v in vars_ or FIELD_VARS:
        tag = f"field-{v}"
        if ledger.is_done(tag):
            continue
        t0 = time.time()
        subprocess.run([sys.executable, "-W", "ignore", "-m", "dune_atlas_pipeline.fields", "build",
                        "--data", data_dir, "--out", str(fdir), "--vars", v], check=True)
        store = fdir / f"{v}.zarr"
        n, sent = _upload_tree(target, ledger, store, f"{prefix}/fields/{v}.zarr", True, log)
        shutil.rmtree(store, ignore_errors=True)
        ledger.mark(tag); ledger.save()
        log(f"field {v}: {n} objects, {sent / 1e6:.1f} MB, {time.time() - t0:.0f} s")


def stream_dunes(target, ledger, src: Path, prefix: str, log=print):
    for name in ("dunes.pmtiles", "nondune-land.pmtiles"):
        p = src / name
        if not p.exists():
            raise FileNotFoundError(p)
        _upload_file(target, ledger, f"{prefix}/dunes/{name}", p, False, log)
    ledger.mark("dunes"); ledger.save()
    log("dunes: uploaded")


class CollisionError(RuntimeError):
    """A planned new key already exists remotely (published objects are immutable)."""


def plan_new_stores(stores, prefix: str):
    """[(local_dir, key_rel)] -> [(key, path)] for every file (AppleDouble/.DS_Store skipped)."""
    files = []
    for local, rel in stores:
        local = Path(local)
        for p in sorted(local.rglob("*")):
            if p.is_file() and not p.name.startswith("._") and p.name not in JUNK:
                files.append((f"{prefix}/{rel.strip('/')}/{p.relative_to(local).as_posix()}", p))
    return files


def assert_no_collision(planned_keys, existing: dict, new_prefixes) -> None:
    """Published versions are immutable: refuse if any planned key exists, or any new store prefix is non-empty
    (unless every existing object there is one of ours with the same size, i.e. a resumed upload)."""
    hits = [k for k in planned_keys if k in existing]
    for pre in new_prefixes:
        pre = pre.rstrip("/") + "/"
        foreign = [k for k in existing if k.startswith(pre) and k not in set(planned_keys)]
        if foreign:
            raise CollisionError(f"{pre} already holds {len(foreign)} objects not produced by this build, e.g. {foreign[:3]}")
    if hits:
        raise CollisionError(f"{len(hits)} planned keys already exist remotely, e.g. {hits[:3]}")


def _put_new_verified(target, key, path, log):
    """Create-only put of one file, then size verification (5 attempts). Returns (key, size)."""
    size = path.stat().st_size
    for attempt in range(5):
        try:
            try:
                target.put_new(key, path)             # create-only: an existing key is never overwritten
            except FileExistsError:
                if attempt == 0:
                    raise CollisionError(f"{key} appeared remotely after the collision check - aborting")
                # a previous attempt of ours succeeded but its verification failed: accept if sizes match
            got = target.size(key)
            if got != size:
                raise IOError(f"size mismatch for {key}: local {size} remote {got}")
            return key, size
        except CollisionError:
            raise
        except Exception as e:  # noqa: BLE001
            if attempt == 4:
                raise
            log(f"retry {attempt + 1} for {key}: {e}")
            time.sleep(2 ** attempt)


def put_new_files(target, ledger: Ledger, todo, log=print, threads=None):
    """Parallel create-only verified puts of [(key, path)]; each key is recorded in the ledger once verified."""
    from concurrent.futures import ThreadPoolExecutor
    done = 0
    with ThreadPoolExecutor(max_workers=threads or UPLOAD_THREADS) as ex:
        for key, size in ex.map(lambda kp: _put_new_verified(target, kp[0], kp[1], log), todo):
            ledger.add(key, size)                         # ledger touched only in this (main) thread
            done += 1
            if done % 200 == 0:
                ledger.save(); log(f"  {done}/{len(todo)}")
    ledger.save()
    return done


def check_new_keys(planned: dict, existing: dict, new_prefixes, ledger: Ledger, resume=False) -> set:
    """Collision check for a planned {key: size} set (e.g. a store that arrives in parts). Returns the keys already
    uploaded by an interrupted run of ours (in the ledger and remote with the same size; only with resume=True)."""
    mine = {k for k, sz in planned.items() if resume and ledger.has(k) and existing.get(k) == sz}
    assert_no_collision([k for k in planned if k not in mine], {k: v for k, v in existing.items() if k not in mine},
                        new_prefixes)
    return mine


def upload_new_tar(target, ledger: Ledger, tar_path, prefix: str, planned: dict, extract_dir, log=print,
                   remove_extracted=True) -> dict:
    """One part of a store that arrives as tars (members '<store>/...'): extract into `extract_dir`, check every
    member against the planned {key: size} set (already collision-checked with check_new_keys), upload create-only
    (verified) the keys not yet in the ledger, then remove the extracted files (they live in a scratch directory)."""
    import tarfile
    extract_dir = Path(extract_dir)
    with tarfile.open(tar_path) as tf:
        members = [m for m in tf.getmembers() if m.isfile()]
        tf.extractall(extract_dir, members=members, filter="data")
    todo, n_done = [], 0
    for m in members:
        key = f"{prefix}/{m.name}"
        p = extract_dir / m.name
        if planned.get(key) != p.stat().st_size:
            raise CollisionError(f"{key}: not in the planned key set or size differs")
        if ledger.has(key):
            n_done += 1
        else:
            todo.append((key, p))
    put_new_files(target, ledger, todo, log)
    if remove_extracted:
        for m in members:
            (extract_dir / m.name).unlink()
    return {"tar": Path(tar_path).name, "members": len(members), "uploaded_now": len(todo), "already": n_done,
            "bytes": sum(m.size for m in members)}


def upload_new_stores(target, ledger: Ledger, stores, prefix: str, existing: dict, log=print, resume=False):
    """Upload locally built stores under NEW keys only. `existing` = live listing of `prefix` taken just before.
    With resume=True, keys already in the ledger AND present remotely with the same size are accepted
    (interrupted upload); anything else that collides aborts before the first byte is sent."""
    files = plan_new_stores(stores, prefix)
    keys = [k for k, _ in files]
    assert len(set(keys)) == len(keys)
    mine = {k for k, p in files if resume and ledger.has(k) and existing.get(k) == p.stat().st_size}
    assert_no_collision([k for k in keys if k not in mine], {k: v for k, v in existing.items() if k not in mine},
                        [f"{prefix}/{rel.strip('/')}" for _, rel in stores])
    todo = [(k, p) for k, p in files if k not in mine]
    log(f"uploading {len(todo)} new objects ({sum(p.stat().st_size for _, p in todo) / 1e6:.1f} MB); "
        f"{len(mine)} already done; 0 collisions with {len(existing)} existing keys")
    put_new_files(target, ledger, todo, log)
    return {"objects": len(files), "bytes": sum(p.stat().st_size for _, p in files), "uploaded_now": len(todo)}


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.stream_upload")
    ap.add_argument("--version", required=True, help="data version prefix, e.g. v1")
    ap.add_argument("--work", required=True, help="local scratch dir (needs ~5 GB free)")
    ap.add_argument("--target", default="r2", help="'r2' or 'local:<dir>'")
    ap.add_argument("--what", nargs="+", default=["cells", "fields", "dunes"],
                    choices=["cells", "fields", "dunes"])
    ap.add_argument("--data", default=os.environ.get(
        "DUNE_WORLD_DATA", ""))
    ap.add_argument("--dunes-dir", default=str(Path(__file__).resolve().parents[3] / "staging" / "dunes"))
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--rows", nargs=2, type=int, help="cell-store row range (testing)")
    ap.add_argument("--vars", nargs="*", help="field variables (testing)")
    ap.add_argument("--force", action="store_true", help="allow starting in a non-empty remote prefix")
    a = ap.parse_args(argv)
    work = Path(a.work); work.mkdir(parents=True, exist_ok=True)
    prefix = f"dune-atlas/{a.version}"
    target = make_target(a.target)
    ledger = Ledger(work / f"uploaded-{a.version}.json")
    if not ledger.d["objects"] and target.any_under(prefix) and not a.force:
        sys.exit(f"{prefix} already has objects and there is no local ledger: published versions are immutable "
                 f"(use a new --version, or --force to resume without a ledger)")
    log = lambda s: print(time.strftime("%H:%M:%S"), s, flush=True)  # noqa: E731
    if "dunes" in a.what:
        stream_dunes(target, ledger, Path(a.dunes_dir), prefix, log)
    if "fields" in a.what:
        stream_fields(target, ledger, work, prefix, a.data, a.vars, log)
    if "cells" in a.what:
        stream_cells(target, ledger, work, prefix, a.data, workers=a.workers,
                     rows=tuple(a.rows) if a.rows else None, log=log)
    tot = sum(ledger.d["objects"].values())
    log(f"ledger: {len(ledger.d['objects'])} objects, {tot / 1e9:.2f} GB")


if __name__ == "__main__":
    main()
