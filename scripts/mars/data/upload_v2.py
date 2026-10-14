"""Publish the Mars dataset v2 (packed-sand fluxes, q = Q/(rho_p phi), phi = 0.6) under a NEW prefix:

    dune-atlas/mars/v1/datasets/fv3-beta1/   (published, never modified)
    dune-atlas/mars/v2/datasets/fv3-beta1/   (this upload; same key layout as v1)

Every v2 key is created once and never overwritten:
  * objects present in the local v2 dev root (cells.zarr without the series shards, cells-aux.zarr, fields/;
    built by `mars.cells rescale-packing` + `mars.sidecars all`) -> create-only PUT (If-None-Match: *),
    pipeline stream_upload.put_new_files, size verified, recorded in the ledger;
  * the 72 cells.zarr/series shards (unchanged, 1.88 GB) -> server-side copy from the v1 key. R2 ignores
    If-None-Match on CopyObject (checked 2026-10-14: a second CopyObject onto an existing key succeeds), so the
    copy is done as a one-part multipart upload (UploadPartCopy with CopySource-If-Match = the v1 ETag) completed
    with If-None-Match: * (R2 answers 412 on an existing key, checked). The copied objects carry a multipart ETag;
    their bytes are verified by md5 against the v1 ETag after the upload (verify_v2.py).
The v2 key set must equal the v1 dataset key set mapped to v2 (checked before any write).

    python scripts/mars/data/upload_v2.py --devroot staging/mars/v2/devroot \
        --ledger staging/mars/r2/uploaded-v2-fv3-beta1.json [--adopt KEY ...] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "pipeline" / "src"))
from dune_atlas_pipeline import stream_upload as SU  # noqa: E402

BUCKET = os.environ.get("R2_BUCKET", "dune-atlas-data")
V1 = "dune-atlas/mars/v1/datasets/fv3-beta1"
V2 = "dune-atlas/mars/v2/datasets/fv3-beta1"
STORES = ("cells.zarr", "cells-aux.zarr", "fields")


def is_series_shard(rel: str) -> bool:
    return rel.startswith("cells.zarr/series/") and not rel.endswith("zarr.json")


def copy_new(s3, src: str, dst: str, src_etag: str, ctype: str, cache: str) -> None:
    """Create-only server-side copy (see module docstring). Raises SU.CollisionError if dst exists."""
    import botocore
    mp = s3.create_multipart_upload(Bucket=BUCKET, Key=dst, ContentType=ctype, CacheControl=cache)
    uid = mp["UploadId"]
    try:
        p = s3.upload_part_copy(Bucket=BUCKET, Key=dst, UploadId=uid, PartNumber=1,
                                CopySource={"Bucket": BUCKET, "Key": src}, CopySourceIfMatch=src_etag)
        s3.complete_multipart_upload(Bucket=BUCKET, Key=dst, UploadId=uid, IfNoneMatch="*",
                                     MultipartUpload={"Parts": [{"ETag": p["CopyPartResult"]["ETag"],
                                                                 "PartNumber": 1}]})
    except botocore.exceptions.ClientError as e:
        s3.abort_multipart_upload(Bucket=BUCKET, Key=dst, UploadId=uid)
        if e.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 412:
            raise SU.CollisionError(f"{dst} exists (or the v1 source changed)") from e
        raise


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--devroot", required=True)
    ap.add_argument("--ledger", required=True)
    ap.add_argument("--adopt", nargs="*", default=[],
                    help="v2 keys already created by an earlier test copy: accepted only if size and ETag equal v1")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    T = SU.R2Target(BUCKET, os.environ.get("R2_ACCOUNT_ID", "107c452850a690ed588d9b00c4283aa8"))
    s3 = T.s3
    v1 = T.list_keys(V1 + "/")
    ex2 = T.list_keys("dune-atlas/mars/v2/")
    root = Path(a.devroot) / V2
    local = SU.plan_new_stores([(root / s, s) for s in STORES], V2)
    local = [(k, p) for k, p in local if not is_series_shard(k[len(V2) + 1:])]
    copies = [(V2 + k[len(V1):], k) for k in sorted(v1) if is_series_shard(k[len(V1) + 1:])]
    planned = {k: p.stat().st_size for k, p in local} | {d: v1[s] for d, s in copies}
    want = {V2 + k[len(V1):] for k in v1}
    if set(planned) != want:
        raise SystemExit(f"v2 key set != v1 key set: missing {sorted(want - set(planned))[:5]}, "
                         f"extra {sorted(set(planned) - want)[:5]}")
    led = SU.Ledger(Path(a.ledger))
    led.d.setdefault("method", {})
    for k in a.adopt:
        h1 = s3.head_object(Bucket=BUCKET, Key=V1 + k[len(V2):]); h2 = s3.head_object(Bucket=BUCKET, Key=k)
        assert k in planned and h1["ETag"] == h2["ETag"] and h1["ContentLength"] == h2["ContentLength"] == planned[k]
        if not led.has(k):
            led.add(k, planned[k]); led.d["method"][k] = "copy_object (create-only test; ETag = v1 ETag)"
    mine = SU.check_new_keys(planned, ex2, [V2], led, resume=True)
    todo_put = [(k, p) for k, p in local if k not in mine]
    todo_cp = [(d, s) for d, s in copies if d not in mine]
    print(json.dumps({"v1_objects": len(v1), "v1_bytes": sum(v1.values()), "v2_existing": len(ex2),
                      "planned": len(planned), "planned_bytes": sum(planned.values()), "already_mine": len(mine),
                      "put": len(todo_put), "put_bytes": sum(p.stat().st_size for _, p in todo_put),
                      "copy": len(todo_cp), "copy_bytes": sum(v1[s] for _, s in todo_cp)}), flush=True)
    if a.dry_run:
        return
    led.save()
    t0 = time.time()
    SU.put_new_files(T, led, todo_put, log=lambda s: print(s, flush=True))
    for k, _ in todo_put:
        led.d["method"][k] = "put_new (create-only PUT)"
    led.save()
    print(f"put {len(todo_put)} in {time.time() - t0:.1f} s", flush=True)

    def one(ds):
        d, s = ds
        h = s3.head_object(Bucket=BUCKET, Key=s)
        copy_new(s3, s, d, h["ETag"], h.get("ContentType", "application/octet-stream"), h.get("CacheControl", SU.CACHE_CONTROL))
        got = T.size(d)
        if got != v1[s]:
            raise IOError(f"size mismatch {d}: {got} != {v1[s]}")
        return d, got, h["ETag"]
    t1 = time.time()
    with ThreadPoolExecutor(8) as exe:
        for d, sz, et in exe.map(one, todo_cp):
            led.add(d, sz); led.d["method"][d] = f"server-side create-only copy of v1 (source ETag {et})"
    led.mark("v2-fv3-beta1"); led.save()
    print(f"copied {len(todo_cp)} in {time.time() - t1:.1f} s", flush=True)
    print(json.dumps({"ledger": a.ledger, "objects": len(led.d["objects"]), "bytes": sum(led.d["objects"].values())}))


if __name__ == "__main__":
    main()
