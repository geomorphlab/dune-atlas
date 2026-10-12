"""Static (non-threshold) gridded layers, e.g. aridity or flux divergence.

Wraps a 2-D field on the ERA5-Land 0.1-degree grid as a length-1 `ut` axis and reuses the
coastal-safe pyramid builder in fields.py, so every gridded layer has the same layout and the
app's zarr-field adapter can draw it (registry: thresholdAware: false -> selector {} -> index 0).

    python -m dune_atlas_pipeline.static --nc layers.nc --var aridity --title "Aridity index" \
        --colormap viridis --log --out STAGING/v1/fields/aridity.zarr
"""
from __future__ import annotations

import argparse

import numpy as np
import xarray as xr

from . import fields


def as_field_dataset(da2d: xr.DataArray, name: str, units: str | None = None,
                     long_name: str | None = None) -> xr.Dataset:
    """2-D (lat, lon) or (y, x) DataArray on the 1801x3600 grid -> Dataset[name](ut=1, latitude, longitude)."""
    dims = da2d.dims
    assert len(dims) == 2 and da2d.shape == (1801, 3600), (dims, da2d.shape)
    da = da2d.rename({dims[0]: "latitude", dims[1]: "longitude"}).astype("float64")
    da = da.expand_dims(ut=[0.0])
    da.attrs = dict(da2d.attrs)
    if units is not None:
        da.attrs["units"] = units
    if long_name is not None:
        da.attrs["long_name"] = long_name
    da.encoding = {}
    ds = da.to_dataset(name=name)
    for c in list(ds.variables):
        ds[c].encoding = {}
    return ds


def build_static_pyramid(da2d: xr.DataArray, name: str, out: str, *, title: str,
                         units: str = "dimensionless", colormap: str = "viridis", log: bool = False,
                         group: str = "static", long_name: str | None = None, **kw) -> dict:
    """Build fields/<name>.zarr for a static 2-D field.

    Registers display metadata for `name` (title/colormap/log in fields.FIELD_META; robust
    p2/p98 colour limits from the data) so the same coastal-safe builder applies. Values are
    stored as-is (no unit scaling); `units` is written to the array attrs. Returns build stats
    plus `clim` (display colour limits) for the registry entry."""
    if name in fields.ANGLE_VARS or name in fields.FLUX_VARS:
        raise ValueError(f"{name!r} collides with a qsat variable name")
    ds = as_field_dataset(da2d, name, units=units, long_name=long_name or title)
    v = ds[name].values
    fin = v[np.isfinite(v)]
    if log:
        fin = fin[fin > 0]
    meta = fields.load_metadata()
    meta[name] = {"p2": float(np.percentile(fin, 2)), "p98": float(np.percentile(fin, 98)),
                  "units": units, "long_name": title}
    fields.FIELD_META[name] = dict(group=group, title=title, colormap=colormap, log=log)
    stats = fields.build_field_pyramid(ds, name, out, meta=meta, **kw)
    import zarr
    g = zarr.open_group(out, mode="a")
    for path in list(g.group_keys()):
        if name in g[path]:
            g[path][name].attrs["units"] = units
    stats = dict(stats) if isinstance(stats, dict) else {"result": stats}
    stats["clim"] = fields.display_clim(name, meta)
    return stats


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--nc", required=True)
    p.add_argument("--var", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--units", default="dimensionless")
    p.add_argument("--colormap", default="viridis")
    p.add_argument("--log", action="store_true")
    a = p.parse_args(argv)
    da = xr.open_dataset(a.nc)[a.var]
    print(build_static_pyramid(da, a.var, a.out, title=a.title, units=a.units,
                               colormap=a.colormap, log=a.log))


if __name__ == "__main__":
    main()
