"""Attributes for a MERRA-2 / JRA-3Q qsat_params store, copied from the ERA5 store so the stores match.

Coordinate and variable attributes are taken verbatim from the ERA5 qsat_params store; the root attributes too,
with the dataset-specific ones (title, wind data, source, period, citation, licence, grid) replaced. Written as
the ATTRS.json that pipeline/gadi/era5/era5_fields.py init reads.

  python make_attrs.py DATASET HIST.zarr ERA5_QSAT.zarr OUT.json
"""
import json
import os
import sys

import zarr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rean_hist import DATASETS  # noqa: E402


def main(ds, hist, era5, out):
    e = zarr.open_group(era5, mode="r")
    h = zarr.open_group(hist, mode="r")
    meta = DATASETS[ds]
    drop = {"_ARRAY_DIMENSIONS"}
    coords = {c: {k: v for k, v in dict(e[c].attrs).items() if k not in drop} for c in ("ut", "latitude", "longitude")}
    names = [k for k in e.array_keys() if k not in coords]
    assert len(names) == 23, names
    vars_ = {v: {k: x for k, x in dict(e[v].attrs).items() if k not in drop} for v in names}
    root = dict(e.attrs)
    for k in ("source_histograms", "date_created"):
        root.pop(k, None)
    period = h.attrs["period"].split(" (")[0]
    y0, y1 = period[:4], period[17:21]
    res = meta["shape"]
    root.update({
        "title": f"Saturated sand-flux parameters from {meta['name']} hourly 10 m winds, {y0}-{y1}",
        "Wind data": f"{meta['name']} $u_{{10}}$ and $v_{{10}}$ (hourly, native {res[0]} x {res[1]} grid), {y0}-{y1} inclusive.",
        "source": meta["source"],
        "grid": meta["grid"],
        "period": period,
        "citation": meta["citation"],
        "licence": meta["licence"],
        "code": "dune-atlas pipeline/src/dune_atlas_pipeline/qsat_compute.py via pipeline/gadi/era5/era5_fields.py",
    })
    json.dump(dict(coords=coords, vars=vars_, root=root), open(out, "w"), indent=1)
    print(out, len(vars_), "variables")


if __name__ == "__main__":
    main(*sys.argv[1:5])
