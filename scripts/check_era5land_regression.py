"""Regression check of a pipeline change: ERA5-Land outputs of the working tree must be byte-identical to those of
a reference commit. Builds the same pieces with both code versions into a scratch directory and compares every
file of every store (names, sizes, bytes), plus the generated registry fragments.

    python scripts/check_era5land_regression.py --ref HEAD --work staging/regress [--full]

Pieces (default: small; --full adds the global qsdiv pyramid and cells-aux / cells-aux-veg sidecars):
  cells.zarr region (fixture shards), field pyramids (dpm, at, qha_rdp_dp on the fixture region, 3 levels),
  qsdiv native staging copy, DP COG array/transform, registry fragments (qsat fields, qsdiv/aridity, vegetation).
"""
import argparse
import filecmp
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DATA = os.environ.get("DUNE_WORLD_DATA", "")
QSDIV_NATIVE = REPO / "staging" / "new-layers" / "qsdiv_native.zarr"
AI_NPZ = REPO / "staging" / "new-layers" / "ai_cellmeans_era5land.npz"
VEG_NC = REPO / "staging" / "new-layers" / "veg" / "tot_cov_mean_2001_2025.nc"

BUILD = r'''
import json, os, sys
import numpy as np
out, data, full = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
from dune_atlas_pipeline import cellstore, fields, qsat_view, qsdiv, cogs, cellsaux, vegetation, extra_layers
from dune_atlas_pipeline.cli import FIXTURE_CELLS, FIXTURE_FIELDS
cellstore.write_region(f"{out}/cells.zarr", data, *FIXTURE_CELLS, log=lambda s: None)
os.remove(f"{out}/cells.zarr.manifest.json")       # contains timings
dq = qsat_view.open_qsat(data, chunks={})
for v in ("dpm", "at", "qha_rdp_dp"):
    fields.build_field_pyramid(dq, v, f"{out}/fields/{v}.zarr", levels=3, region=FIXTURE_FIELDS)
arr = qsdiv.read_native(sys.argv[4])
qsdiv.write_native(arr, f"{out}/qsdiv_native.zarr")
a = cogs._dp_slice(data, 14)
np.save(f"{out}/cog_dp14.npy", a)
json.dump(list(cogs.TRANSFORM_4326), open(f"{out}/cog_transform.json", "w"))
open(f"{out}/qsat_fields.yaml", "w").write(open(fields.write_registry_fragment(f"{out}/qsat_fields.yaml")).read())
json.dump({"qsdiv": qsdiv.registry_layer(), "attrs": qsdiv.var_attrs(), "extra": extra_layers.fragment(),
           "veg": vegetation.fragment()}, open(f"{out}/registry_bits.json", "w"), indent=1, sort_keys=True)
if full:
    qsdiv.build_pyramid(sys.argv[4], f"{out}/fields/qsdiv.zarr")
    cellsaux.build(f"{out}/cells-aux.zarr", data, sys.argv[4], ai_npz=sys.argv[5])
    vegetation.build_cells_aux(f"{out}/cells-aux-veg.zarr", sys.argv[6], data)
print("built", out)
'''


def tree_digest(root: Path) -> dict:
    out = {}
    for p in sorted(root.rglob("*")):
        if p.is_file():
            out[p.relative_to(root).as_posix()] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default="HEAD")
    ap.add_argument("--work", default=str(REPO / "staging" / "regress"))
    ap.add_argument("--full", action="store_true")
    a = ap.parse_args()
    work = Path(a.work); work.mkdir(parents=True, exist_ok=True)
    ref_src = Path(tempfile.mkdtemp(dir=work, prefix="ref-src-"))
    arch = subprocess.run(["git", "-C", str(REPO), "archive", a.ref, "pipeline/src", "registry"], check=True,
                          capture_output=True).stdout
    subprocess.run(["tar", "-x", "-C", str(ref_src)], input=arch, check=True)
    # the reference code resolves REPO (registry/, staging/drift) relative to its own location: give it the
    # same staging/ through a symlink so both builds read identical inputs
    (ref_src / "staging").symlink_to(REPO / "staging")
    res = {}
    for tag, src in (("ref", ref_src / "pipeline" / "src"), ("new", REPO / "pipeline" / "src")):
        out = work / tag
        if out.exists():
            raise SystemExit(f"{out} exists; use a fresh --work")
        out.mkdir()
        env = dict(os.environ, PYTHONPATH=str(src), DUNE_ATLAS_DRIFT=str(REPO / "staging" / "drift" / "qsat_drift.zarr"))
        subprocess.run([sys.executable, "-c", BUILD, str(out), DATA, "1" if a.full else "0", str(QSDIV_NATIVE),
                        str(AI_NPZ), str(VEG_NC)], check=True, env=env, cwd=str(out))
        res[tag] = tree_digest(out)
    ref, new = res["ref"], res["new"]
    diff = sorted(k for k in set(ref) | set(new) if ref.get(k) != new.get(k))
    summary = {"ref": a.ref, "files": len(ref), "identical": len(ref) - len([k for k in diff if k in ref]),
               "differing_or_missing": diff[:50], "n_differing_or_missing": len(diff),
               "stores": sorted({k.split("/")[0] if not k.startswith("fields/") else "/".join(k.split("/")[:2]) for k in ref})}
    (work / "regression.json").write_text(json.dumps(summary, indent=1))
    print(json.dumps(summary, indent=1))
    sys.exit(0 if not diff else 1)


if __name__ == "__main__":
    main()
