"""ERA5 field pyramids, flux divergence and colour-limit statistics one variable at a time (small local footprint).

The land-cell qsat copy arrives from Gadi as one tar per variable (pipeline/gadi/era5/era5_atlas_cells.py
--qsat-subset, repacked per variable) in --vars-dir (qsat_meta.tar first, then qsat_<var>.tar as they arrive).
For each variable: extract into a scratch zarr, build fields/<var>.zarr (fields.build_field_pyramid, land mask
from era5_cellmasks.nc), record p2/p98 at u*,th index 14 over the land cells, delete the extracted data and the tar.
rdpm and rdpa are kept until the flux divergence (qsdiv.divergence per threshold) is written; then
fields/qsdiv.zarr follows. One process; blosc/OMP threads and topozarr workers limited by --threads.

    python scripts/build_era5_fields_pervar.py --vars-dir W/e5vars --work W/e5data --st staging/era5/atlas_v2
"""
import argparse
import json
import os
import shutil
import sys
import tarfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "pipeline" / "src"))
Z = "era5_1950_2024_qsat_params.zarr"


def wait_for(p: Path, timeout=3600):  # noqa: D103
    t0 = time.time()
    while not p.exists():
        if time.time() - t0 > timeout:
            raise TimeoutError(p)
        time.sleep(5)


def extract(tar: Path, dest: Path):
    with tarfile.open(tar) as tf:
        tf.extractall(dest, filter="data")
    tar.unlink()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vars-dir", required=True); ap.add_argument("--work", required=True)
    ap.add_argument("--st", required=True); ap.add_argument("--threads", type=int, default=2)
    a = ap.parse_args()
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    from numcodecs import blosc
    blosc.set_nthreads(a.threads)
    import dask
    dask.config.set(scheduler="synchronous")
    import numpy as np
    import xarray as xr
    from dune_atlas_pipeline import constants as C, fields as F, qsdiv as QS
    from dune_atlas_pipeline.cellstore import FIELD_VARS, load_masks
    from dune_atlas_pipeline.grid import DATASETS
    ds = DATASETS["era5"]
    vd, work, st = Path(a.vars_dir), Path(a.work), Path(a.st)
    out = st / "stores" / "fields"; out.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    if not (work / ds.masks_file).exists():
        (work / ds.masks_file).symlink_to((st / ds.masks_file).resolve())
    land = load_masks(str(work), ds)[0]
    meta_path = st / "qsat_field_metadata.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    stats_path = st / "logs" / "fields_build.jsonl"; stats_path.parent.mkdir(exist_ok=True)
    if not (work / Z / ".zgroup").exists():
        wait_for(vd / "qsat_meta.tar")
        extract(vd / "qsat_meta.tar", work)
    canon = F.load_metadata()                 # ERA5-Land metadata: names/descriptions (colour limits from ERA5)
    log = lambda m: print(time.strftime("%H:%M:%S"), m, flush=True)  # noqa: E731

    def next_var():
        """rdpm, rdpa first (flux divergence), then whichever variable has arrived (any order)."""
        todo = [v for v in FIELD_VARS if not (out / f".{v}.done").exists()]
        if not todo:
            return None
        first = [v for v in ("rdpm", "rdpa") if v in todo]
        cands = first[:1] if first else todo
        t0 = time.time()
        while True:
            for v in cands:
                if (work / Z / v / ".zarray").exists() or (vd / f"qsat_{v}.tar").exists():
                    return v
            if time.time() - t0 > 3600:
                raise TimeoutError(cands)
            time.sleep(5)

    while (v := next_var()) is not None:
        dst = out / f"{v}.zarr"
        if not (work / Z / v / ".zarray").exists():
            extract(vd / f"qsat_{v}.tar", work)
        dq = xr.open_zarr(str(work / Z), consolidated=False, chunks=None)[[v]]
        a14 = np.where(land, dq[v].isel(ut=C.UT_DEFAULT_INDEX).values, np.nan)
        f = a14[np.isfinite(a14)]
        at = dq[v].attrs
        meta[v] = {"long_name": at.get("long_name", ""), "units": at.get("units", ""), "description": at.get("description", ""),
                   "p2": float(np.percentile(f, 2)), "p98": float(np.percentile(f, 98)),
                   "frac_finite": round(float(f.size / a14.size), 4)}
        meta_path.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
        m = {k: {**canon.get(k, {}), **meta[k]} for k in meta}
        st_ = F.build_field_pyramid(dq, v, str(dst), meta=m, dataset=ds, land=land, max_workers=a.threads)
        with open(stats_path, "a") as fh:
            fh.write(json.dumps(st_) + "\n")
        (out / f".{v}.done").write_text(json.dumps(st_))
        log(f"{v}: {st_['bytes'] / 1e6:.1f} MB, {st_['total_s']} s, rss {st_['peak_rss_gb']} GB")
        del dq, a14
        if v == "rdpa" and not (st / "qsdiv_native_era5.zarr").exists():
            g = ds.grid
            lat, lon = QS.exact_coords(g.ny, g.nx, g.lat0, g.dlat, g.lon0, g.dlon)
            src = xr.open_zarr(str(work / Z), consolidated=False, chunks=None)
            q = np.empty((64, g.ny, g.nx), "f4")
            for k in range(64):                   # one threshold at a time (float64 2-D fields only)
                qk = np.where(land, src["rdpm"].isel(ut=k).values, np.nan)
                ak = np.where(land, src["rdpa"].isel(ut=k).values, np.nan)
                q[k] = (QS.divergence(qk, ak, lat, lon) * C.S2Y).astype("f4")
            QS.write_native(q, str(st / "qsdiv_native_era5.zarr"), g)
            (st / "logs" / "qsdiv_compute.json").write_text(json.dumps(
                {"shape": list(q.shape), "finite_ut14": int(np.isfinite(q[C.UT_DEFAULT_INDEX]).sum()),
                 "dune_stats_ut14": QS.dune_stats(str(work), q[C.UT_DEFAULT_INDEX], dataset=ds)}))
            log("qsdiv native written")
            del q
        if v != "rdpm":                           # rdpm is needed until rdpa is done
            shutil.rmtree(work / Z / v)
            if v == "rdpa" and (work / Z / "rdpm").exists():
                shutil.rmtree(work / Z / "rdpm")
    if not (out / ".qsdiv.done").exists():
        st_ = QS.build_pyramid(str(st / "qsdiv_native_era5.zarr"), str(out / "qsdiv.zarr"), dataset=ds)
        (out / ".qsdiv.done").write_text(json.dumps(st_))
        log(f"qsdiv pyramid: {json.dumps(st_)}")
    print(json.dumps({"vars": len(meta), "stores": sorted(p.name for p in out.glob("*.zarr"))}))


if __name__ == "__main__":
    main()
