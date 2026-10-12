"""Command-line entry point: `dune-atlas <command>` (or `python -m dune_atlas_pipeline.cli`).

    dune-atlas info
    dune-atlas cells   --data DIR --out STAGING/cells.zarr [--region y0 y1 x0 x1]
    dune-atlas fields  --data DIR --out STAGING/fields [--vars qacb at ...] [--levels 5]
    dune-atlas dunes   --data DIR --out STAGING/dunes      (geojson + vector/raster PMTiles; needs tippecanoe)
    dune-atlas fixture --data DIR --out STAGING/fixture      (Namib / southern Africa subset)

  New layers (2026-10-13; docs/sources.md, docs/validation-qsdiv.md):
    dune-atlas aridity        --data DIR --out STAGING/fields/aridity.zarr   (native 30" GeoZarr pyramid)
    dune-atlas aridity-cells  --data DIR --out STAGING/ai_cellmeans.npz [--grid era5-land|era5]
    dune-atlas qsdiv          --data DIR --out STAGING/qsdiv_native.zarr     (64 ut, m/yr)
    dune-atlas qsdiv-pyramid  --native STAGING/qsdiv_native.zarr --out STAGING/fields/qsdiv.zarr
    dune-atlas cells-aux      --data DIR --qsdiv STAGING/qsdiv_native.zarr --ai STAGING/ai_cellmeans.npz --out STAGING/cells-aux.zarr
    dune-atlas extra-registry                                (registry/generated/x_extra_fields.yaml)
    dune-atlas upload-new --version v1 --work STAGING --store LOCAL=REL [...] [--target r2|local:DIR] [--resume]
        uploads locally built stores to NEW keys dune-atlas/<version>/<REL>/...; aborts if any key exists
"""
import argparse
import json
import os

DEFAULT_DATA = os.environ.get("DUNE_WORLD_DATA", os.path.expanduser("~/Documents/research/projects/dune-world/data"))
FIXTURE_CELLS = (1056, 1216, 1904, 2000)                 # ~ -15.5..-31.5 lat, 10.4..20 lon (shard-aligned)
FIXTURE_FIELDS = dict(latitude=slice(1000, 1250), longitude=slice(1900, 2200))  # -10..-35 lat, 10..40 lon
FIXTURE_VARS = ["qacb", "at", "sige_sigh", "ae", "uft"]


def main(argv=None):
    p = argparse.ArgumentParser(prog="dune-atlas")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("info")
    for name in ("cells", "fields", "dunes", "fixture"):
        s = sub.add_parser(name)
        s.add_argument("--data", default=DEFAULT_DATA)
        s.add_argument("--out", required=True)
        if name == "cells":
            s.add_argument("--region", nargs=4, type=int, default=[0, 1801, 0, 3600])
        if name == "fields":
            s.add_argument("--vars", nargs="*")
            s.add_argument("--levels", type=int, default=5)
    s = sub.add_parser("aridity"); s.add_argument("--data", default=DEFAULT_DATA); s.add_argument("--out", required=True)
    s.add_argument("--keepbits", type=int, default=12)
    s = sub.add_parser("aridity-cells"); s.add_argument("--data", default=DEFAULT_DATA); s.add_argument("--out", required=True)
    s.add_argument("--grid", default="era5-land", choices=["era5-land", "era5"])
    s = sub.add_parser("qsdiv"); s.add_argument("--data", default=DEFAULT_DATA); s.add_argument("--out", required=True)
    s = sub.add_parser("qsdiv-pyramid"); s.add_argument("--native", required=True); s.add_argument("--out", required=True)
    s.add_argument("--keepbits", type=int, default=12)
    s = sub.add_parser("cells-aux"); s.add_argument("--data", default=DEFAULT_DATA); s.add_argument("--out", required=True)
    s.add_argument("--qsdiv", required=True); s.add_argument("--ai", required=True)
    sub.add_parser("extra-registry")
    s = sub.add_parser("upload-new"); s.add_argument("--version", required=True); s.add_argument("--work", required=True)
    s.add_argument("--store", nargs="+", required=True, help="LOCAL_DIR=REL_KEY, e.g. staging/x/aridity.zarr=fields/aridity.zarr")
    s.add_argument("--target", default="r2"); s.add_argument("--resume", action="store_true")
    a = p.parse_args(argv)
    if a.cmd in NEW_COMMANDS:
        return NEW_COMMANDS[a.cmd](a)
    if a.cmd == "info":
        from . import constants as C
        for k in C.__all__:
            print(k, getattr(C, k))
        return
    from . import cellstore, qsat_view, fields, dunes
    if a.cmd == "cells":
        y0, y1, x0, x1 = a.region
        cellstore.write_region(a.out, a.data, y0, y1, x0, x1)
    elif a.cmd == "fields":
        # Preferred for the full build: `python -m dune_atlas_pipeline.fields build` (no dask, resumable),
        # wrapped by scripts/run_fields_full.sh. This path is kept for small/ad-hoc builds.
        import xarray as xr
        dq = qsat_view.open_qsat(a.data, chunks={})
        os.makedirs(a.out, exist_ok=True)
        for v in a.vars or cellstore.FIELD_VARS:
            print("building", v, flush=True)
            fields.build_field_pyramid(dq, v, os.path.join(a.out, f"{v}.zarr"), levels=a.levels)
    elif a.cmd == "dunes":
        # --out is a directory: dunes.geojson, dunes.pmtiles, dunes-raster.pmtiles, dunes_summary.json.
        # Needs tippecanoe >= 2.17 on PATH (conda-forge; not pip-installable) - see docs/validation-dunes.md.
        print(json.dumps(dunes.build_all(f"{a.data}/layers.nc", a.out), indent=1))
    elif a.cmd == "fixture":
        import xarray as xr
        os.makedirs(a.out, exist_ok=True)
        cellstore.write_region(os.path.join(a.out, "cells.zarr"), a.data, *FIXTURE_CELLS)
        dq = qsat_view.open_qsat(a.data, chunks={})
        for v in FIXTURE_VARS:
            fields.build_field_pyramid(dq, v, os.path.join(a.out, "fields", f"{v}.zarr"), levels=3, region=FIXTURE_FIELDS)
        feats = list(dunes.dune_polygons(f"{a.data}/layers.nc",
                                         window=(FIXTURE_FIELDS["latitude"], FIXTURE_FIELDS["longitude"])))
        json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(a.out, "dunes.geojson"), "w"))


def _aridity(a):
    from . import aridity
    print(json.dumps(aridity.build_pyramid(a.data, a.out, keepbits=a.keepbits)))


def _aridity_cells(a):
    from . import aridity
    aridity.main(["cellmeans", "--data", a.data, "--out", a.out, "--grid", a.grid])


def _qsdiv(a):
    from . import qsdiv
    qsdiv.main(["compute", "--data", a.data, "--out", a.out])


def _qsdiv_pyramid(a):
    from . import qsdiv
    print(json.dumps(qsdiv.build_pyramid(a.native, a.out, keepbits=a.keepbits)))


def _cells_aux(a):
    from . import cellsaux
    print(json.dumps(cellsaux.build(a.out, a.data, a.qsdiv, ai_npz=a.ai)))


def _extra_registry(a):
    from . import extra_layers
    print(extra_layers.write())


def _upload_new(a):
    import time
    from pathlib import Path
    from . import stream_upload as su
    prefix = f"dune-atlas/{a.version}"
    stores = [tuple(x.split("=", 1)) for x in a.store]
    target = su.make_target(a.target)
    work = Path(a.work); work.mkdir(parents=True, exist_ok=True)
    ledger = su.Ledger(work / f"uploaded-new-{a.version}.json")
    log = lambda m: print(time.strftime("%H:%M:%S"), m, flush=True)  # noqa: E731
    existing = target.list_keys(prefix + "/")
    log(f"live listing: {len(existing)} existing objects under {prefix}/")
    print(json.dumps(su.upload_new_stores(target, ledger, stores, prefix, existing, log=log, resume=a.resume)))


NEW_COMMANDS = {"aridity": _aridity, "aridity-cells": _aridity_cells,
                "qsdiv": _qsdiv, "qsdiv-pyramid": _qsdiv_pyramid, "cells-aux": _cells_aux,
                "extra-registry": _extra_registry, "upload-new": _upload_new}


if __name__ == "__main__":
    main()
