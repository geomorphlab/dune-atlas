"""Mars `fields/<var>.zarr` GeoZarr pyramids (topozarr layout, as Earth's fields.py) on the contract grid.

The Earth builder (fields.build_field_pyramid) is specialised to the ut axis and the Earth dataset registry; this
module runs the same steps with the grain-size axis `d`:

1. fields.display_array converts to display units exactly as on Earth (fluxes m^2/s -> m^2/yr, ratios clipped
   to +-6e4, angles in radians, attrs from fields.FIELD_META and the Mars qsat_field_metadata.json);
2. the (d=64, y, x) Dataset goes through topozarr.create_pyramid (EPSG:4326, pixel registration); at 2° the grid
   is 180 px wide, so there is one level (fields.choose_levels(180) == 1; coarser levels would follow the Earth
   rules via fields.coarse_levels);
3. every level is rewritten with blosc zstd-5 byte-shuffle and 12-bit mantissas (fields._rewrite_array /
   fields.bitround), keeping topozarr's shapes, chunks, shards and attrs.
2-D layers (rho_mean) use nativepyramid.write_native_pyramid (dims (y, x), as the Earth aridity layer).
Grid: rows lat 89 -> -89, columns lon -179 -> 179 (cells.GRID); cell edges x0 = -180, y0 = 90, 2° pixels.
"""
from __future__ import annotations

import time

import numpy as np
import xarray as xr

from .. import fields as EF
from . import cells as CE
from . import constants as M

D_COORD = np.asarray(M.D_VALUES_UM, "float64")
SOURCE = ("Fields computed for the Mars dune atlas from the MCMC FV3-based Mars GCM Beta Output Release 1 hourly "
          "lowest-level winds, temperature and air density (NASA Ames Mars Climate Modeling Center 2023; model "
          "physics Haberle et al. 2019, Icarus 333, 130-164, doi:10.1016/j.icarus.2019.03.026), with the per-hour "
          "threshold and transport rate of Pähtz & Durán (2023) J. Fluid Mech. 963, A20, doi:10.1017/jfm.2023.343, "
          "and the crest-mode methods outlined in Gunn, A. (2026) The distribution of Earth's wind-blown sand dunes. "
          "Nature Communications. doi:10.1038/s41467-026-75466-y")
DATASET_ATTRS = {"body": "mars", "dune_atlas:dataset": CE.DATASET["id"], "dataset_name": CE.DATASET["name"],
                 "dataset_resolution": "2°", "dataset_n_hours": CE.NT, "dataset_citation": CE.DATASET["citation"],
                 "dataset_source": CE.DATASET["source"], "transport_law": CE.DATASET["transport_law"]}


def as_dataset(arr3: np.ndarray, var: str, attrs: dict) -> xr.Dataset:
    """(64 d, 90, 180) source-unit array -> Dataset[var](ut, latitude, longitude) as fields.display_array expects
    (the `ut` name is internal; renamed to `d` before writing)."""
    assert arr3.shape == (len(D_COORD), CE.NY, CE.NX), arr3.shape
    da = xr.DataArray(np.asarray(arr3, "f8"), dims=("ut", "latitude", "longitude"),
                      coords={"ut": np.arange(arr3.shape[0], dtype="f8"), "latitude": CE.LAT.astype("f8"),
                              "longitude": CE.LON.astype("f8")}, attrs=dict(attrs))
    return da.to_dataset(name=var)


def build_field_pyramid(arr3: np.ndarray, var: str, out: str, meta: dict, src_attrs: dict, *,
                        keepbits: int | None = EF.DEFAULT_KEEPBITS, codec: str = EF.DEFAULT_CODEC,
                        extra_var_attrs: dict | None = None) -> dict:
    import topozarr
    import xproj  # noqa: F401
    import zarr
    t0 = time.time()
    dq = as_dataset(arr3, var, src_attrs)
    da = EF.display_array(dq, var, meta)
    attrs = dict(da.attrs)
    da = da.rename({"ut": "d"}).assign_coords(d=D_COORD)
    da.attrs = attrs
    nlev = EF.choose_levels(da.sizes["longitude"])
    ds = xr.Dataset(coords={"d": D_COORD})
    ds[var] = da.rename({"latitude": "y", "longitude": "x"})
    assert tuple(ds.dims) == ("d", "y", "x"), tuple(ds.dims)
    for name in list(ds.variables):
        ds[name].encoding = {}
    ds["y"].attrs.update(units="degrees_north", standard_name="latitude")
    ds["x"].attrs.update(units="degrees_east", standard_name="longitude")
    ds["d"].attrs.update(units="um", long_name="median grain diameter d")
    ds.attrs.update({
        "title": f"dune-atlas Mars field: {EF.FIELD_META[var]['title']}",
        "source": SOURCE, "license": "CC-BY-4.0",
        "d_default_index": int(M.D_DEFAULT_INDEX), "d_values_um": [int(x) for x in M.D_VALUES_UM],
        "dune_atlas:resampling": ("nearest-finite (first finite native cell of each window, row-major)"
                                  if var in EF.ANGLE_VARS else
                                  "count-weighted nan-mean over native cells (recomputed from level 0)"),
        **DATASET_ATTRS,
    })
    ds = ds.proj.assign_crs(spatial_ref="EPSG:4326")
    hints = {var: topozarr.ZarrLayerVarConfig(clim=EF.stored_clim(var, meta), colormap=EF.FIELD_META[var]["colormap"])}
    pyr = topozarr.create_pyramid(ds, levels=nlev, x_dim="x", y_dim="y",
                                  method="nearest" if var in EF.ANGLE_VARS else "mean", layer_hints=hints)
    pyr.write(out, mode="w")
    native = ds[var].values
    data = [native] + (EF.coarse_levels(native, var, nlev) if nlev > 1 else [])
    root = zarr.open_group(out, mode="a", zarr_format=3)
    for lev, arr in enumerate(data):
        if keepbits is not None and keepbits < 23:
            arr = EF.bitround(arr, keepbits)
        EF._rewrite_array(root[str(lev)], var, arr, codec)
        if extra_var_attrs:
            root[str(lev)][var].attrs.update(extra_var_attrs)
    root.attrs.update({k: v for k, v in ds.attrs.items() if k in ("title", "source", "license", "d_default_index",
                                                               "d_values_um", "dune_atlas:resampling")} | DATASET_ATTRS)
    st = {"var": var, "levels": nlev, "shape": list(native.shape), "keepbits": keepbits, "codec": codec,
          "bytes": EF._du(out), "total_s": round(time.time() - t0, 1)}
    if keepbits is not None and keepbits < 23:
        fin = np.isfinite(native) & (native != 0)
        r = EF.bitround(native, keepbits)
        st["keepbits_max_rel_err"] = float((np.abs(r[fin].astype("f8") - native[fin]) / np.abs(native[fin])).max()) \
            if fin.any() else 0.0
    return st


def build_2d_pyramid(arr2: np.ndarray, var: str, out: str, *, var_attrs: dict, title: str, clim, colormap: str,
                     keepbits: int | None = 12) -> dict:
    """2-D (y, x) layer (e.g. rho_mean) with nativepyramid.write_native_pyramid (one level at 2°)."""
    from ..nativepyramid import common_factors, write_native_pyramid
    assert arr2.shape == (CE.NY, CE.NX)
    root_attrs = {"title": f"dune-atlas Mars field: {title}", "source": SOURCE, "license": "CC-BY-4.0",
                  "dune_atlas:resampling": "count-weighted nan-mean of native pixels per f x f window",
                  "dune_atlas:threshold_independent": True, **DATASET_ATTRS}
    return write_native_pyramid(out, var, np.asarray(arr2, "f4"), x0=-180.0, y0=90.0, dx=2.0, dy=-2.0,
                                factors=common_factors(CE.NY, CE.NX), var_attrs=var_attrs, root_attrs=root_attrs,
                                zarr_layer_hint={"clim": list(clim), "colormap": colormap}, keepbits=keepbits,
                                chunk=CE.NX, shard_chunks=1)
