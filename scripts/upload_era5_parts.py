"""Create-only upload of a store that arrives from Gadi as tars (ERA5 cells.zarr: one tar per 8 shard rows + a
metadata tar), keeping only one part on local disk at a time.

    R2_ACCOUNT_ID=... python scripts/upload_era5_parts.py --files cells_files.txt --store cells.zarr \
        --work staging/era5/atlas/r2 --extract SCRATCH_DIR TAR [TAR ...]

* --files: `find cells.zarr -type f -printf '%P %s\\n'` written on Gadi: the complete key set with sizes. Before the
  first tar, a live listing of all of dune-atlas/ is taken and the complete key set is checked against it
  (stream_upload.check_new_keys: no planned key may exist, the store prefix must hold nothing foreign).
* each TAR is md5-checked (against the Gadi summary if given), extracted into SCRATCH_DIR, every member checked
  against the planned key/size set, uploaded create-only (If-None-Match: *) with size verification, recorded in the
  shared ledger (uploaded-new-dune-atlas_v1_datasets_era5.json, also used by `dune-atlas upload-new --prefix`),
  and the extracted copy removed. Re-running skips ledger keys (resumable).
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "pipeline" / "src"))
PREFIX = "dune-atlas/v1/datasets/era5"


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def main():
    from dune_atlas_pipeline import stream_upload as su
    ap = argparse.ArgumentParser()
    ap.add_argument("--files", required=True); ap.add_argument("--store", default="cells.zarr")
    ap.add_argument("--work", required=True); ap.add_argument("--extract", required=True)
    ap.add_argument("--summary", help="Gadi cells_summary.json (tar md5)"); ap.add_argument("--target", default="r2")
    ap.add_argument("tars", nargs="+")
    a = ap.parse_args()
    log = lambda m: print(time.strftime("%H:%M:%S"), m, flush=True)  # noqa: E731
    planned = {}
    for line in Path(a.files).read_text().splitlines():
        rel, size = line.rsplit(" ", 1)
        planned[f"{PREFIX}/{a.store}/{rel}"] = int(size)
    target = su.make_target(a.target)
    work = Path(a.work); work.mkdir(parents=True, exist_ok=True)
    ledger = su.Ledger(work / f"uploaded-new-{PREFIX.replace('/', '_')}.json")
    existing = target.list_keys("dune-atlas/")
    mine = su.check_new_keys(planned, existing, [f"{PREFIX}/{a.store}"], ledger, resume=True)
    log(f"live listing {len(existing)} objects; planned {len(planned)} keys ({sum(planned.values()) / 1e9:.3f} GB); "
        f"0 collisions; {len(mine)} already uploaded by an earlier run")
    sums = json.load(open(a.summary))["tars"] if a.summary else {}
    out = []
    for t in a.tars:
        t = Path(t)
        if t.name in sums:
            got = md5(t)
            assert got == sums[t.name]["md5"], (t.name, got)
        r = su.upload_new_tar(target, ledger, t, PREFIX, planned, a.extract, log=log)
        r["md5_checked"] = t.name in sums
        log(json.dumps(r)); out.append(r)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
