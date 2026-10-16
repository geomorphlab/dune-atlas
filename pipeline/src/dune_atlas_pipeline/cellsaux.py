"""`cells-aux.zarr`: per-cell sidecar to the immutable `cells.zarr` (same grid, same key layout).

Extensible: one array per variable, each with documented attrs (units, long_name, long_name_latex, source,
licence, ...); new variables are new arrays (new object keys) - existing arrays are never rewritten.
Root attrs `variables` lists them, `grid` repeats cells.zarr's grid.

Layout (zarr v3, grid of the wind dataset - ERA5-Land 1801 x 3600, latitude 90 -> -90, longitude -180 -> 179.9;
ERA5 721 x 1440, longitude -180 -> 179.75; cell centres):
* threshold-dependent arrays, e.g. `qsdiv` (1801, 3600, 64 ut) float32: exactly the cells.zarr `fields`
  convention - shard (16, 16, 64) = one object per 16 x 16 cells, inner chunk one cell (1, 1, 64),
  blosc zstd-5 bitshuffle, shard index at the END (zarrita suffix read; the app's CachingStore memoises it);
* scalar arrays, e.g. `ai_mean`, `ai_valid_frac`, `ai_sat_frac` (1801, 3600) float32: the cells.zarr `land`/
  `dunes` convention - plain chunks (unsharded; one whole-object read per click), here (64, 64) cells
  (16 kB raw; a (1, 1) inner chunk would make the shard index 4x larger than the data).
Only land cells (cells.zarr `land`) carry values; everything else is NaN (fill). Chunks / shards without any
finite value are not written, so ocean shards are absent exactly as in cells.zarr.
"""
from __future__ import annotations

import os

import numpy as np

from . import constants as C
from .grid import ERA5_LAND_GRID, get_dataset

SHARD = 16
SCALAR_CHUNK = 64
GRID = ERA5_LAND_GRID.attrs()
CONVENTIONS_V1 = ("threshold-dependent arrays: (latitude, longitude, ut), shard 16x16 cells, inner chunk "
                  "1 cell, index at end; scalar arrays: (latitude, longitude), plain 64x64 chunks; "
                  "NaN = no value (ocean, or not defined)")
CONVENTIONS = ("threshold-dependent arrays: (latitude, longitude, ut), shard 16x16 cells, inner chunk 1 cell, index "
               "at end; scalar arrays: (latitude, longitude), plain 64x64 chunks; the fill value marks cells with no "
               "data (not land, or undefined)")


def _sharding(inner, typesize=4):
    from zarr.codecs import BloscCodec, BytesCodec, ShardingCodec
    return ShardingCodec(chunk_shape=inner, codecs=[BytesCodec(), BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle",
                                                                             typesize=typesize)], index_location="end")


# licence text of the atlas-derived per-cell values, by the SPDX id of the dataset's fields (grid.DATASETS info)
FIELDS_LICENCE_TEXT = {"CC-BY-4.0": "CC BY 4.0", "CC-BY-NC-SA-4.0": "CC BY-NC-SA 4.0"}

def open_store(out, land: np.ndarray, root_attrs: dict | None = None, dataset=None):
    import zarr
    ds = get_dataset(dataset)
    root = zarr.open_group(out, mode="a", zarr_format=3)
    if "variables" not in root.attrs:
        a = {
            "title": "dune-atlas per-cell auxiliary variables (sidecar to cells.zarr)",
            "grid": ds.grid.attrs(), "ut_values": C.UT_VALUES.tolist(), "ut_default_index": C.UT_DEFAULT_INDEX,
            "land_cells": int(land.sum()), "variables": [],
            "conventions": CONVENTIONS_V1 if ds.id == "era5-land" else CONVENTIONS,
        }
        if ds.info:
            a.update({"dataset": ds.info["id"], "dataset_name": ds.name, "dataset_resolution": ds.resolution,
                      "land_cells_definition": ds.info["land_cells"]})
        root.attrs.update({**a, **(root_attrs or {})})
    return root


def write_variable(root, name: str, data: np.ndarray, land: np.ndarray, attrs: dict):
    """Add array `name` (2-D scalar or 3-D (y, x, ut)) masked to land. Refuses to overwrite an existing array."""
    from zarr.codecs import BloscCodec
    if name in root:
        raise FileExistsError(f"{name} already in store (arrays are immutable once published)")
    ny, nx = land.shape
    data = np.array(data, dtype="f4", copy=True)
    assert data.shape[:2] == (ny, nx), data.shape
    data[~land] = np.nan
    if data.ndim == 3:
        nut = data.shape[2]
        a = root.create_array(name, shape=data.shape, dtype="float32", chunks=(SHARD, SHARD, nut),
                              serializer=_sharding((1, 1, nut)), compressors=None, fill_value=np.nan,
                              dimension_names=["latitude", "longitude", "ut"], attributes=attrs)
    else:
        a = root.create_array(name, shape=data.shape, dtype="float32", chunks=(SCALAR_CHUNK, SCALAR_CHUNK),
                              compressors=[BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle", typesize=4)],
                              fill_value=np.nan, dimension_names=["latitude", "longitude"], attributes=attrs)
    # write block by block (only blocks with land) so all-ocean chunks/shards are never created
    step = SHARD if data.ndim == 3 else SCALAR_CHUNK
    for y0 in range(0, ny, step):
        for x0 in range(0, nx, step):
            ys, xs = slice(y0, min(ny, y0 + step)), slice(x0, min(nx, x0 + step))
            blk = data[ys, xs]
            if np.isfinite(blk).any():
                a[ys, xs] = blk
    v = list(root.attrs["variables"])
    v.append(name)
    root.attrs["variables"] = v
    return a


def count_objects(path) -> dict:
    out = {}
    for d, _, fs in os.walk(path):
        rel = os.path.relpath(d, path).split(os.sep)[0]
        fs = [f for f in fs if not f.startswith("._") and f != ".DS_Store"]
        out[rel] = out.get(rel, 0) + len(fs)
    return out


def build(out, data_dir, qsdiv_native: str, ai_npz: str | None = None, ai_means: dict | None = None,
          dataset=None) -> dict:
    """Build cells-aux.zarr from the staging qsdiv (ut, y, x) zarr and the AI cell means. For ERA5 also the
    land-sea mask `lsm` (from the dataset mask file)."""
    import xarray as xr
    from . import aridity, qsdiv
    from .cellstore import load_masks
    ds = get_dataset(dataset)
    g = ds.grid
    land = load_masks(data_dir, ds)[0]
    root = open_store(out, land, dataset=ds)
    q = qsdiv.read_native(qsdiv_native)                     # (64, ny, nx) float32 m/yr
    assert q.shape[1:] == g.shape
    qa = qsdiv.var_attrs(g)
    if ds.id == "era5-land":
        q_source = "Gunn (2026) Nat Commun doi:10.1038/s41467-026-75466-y; data doi:10.5281/zenodo.20046812"
    else:
        q_source = (f"Derived from the {ds.name} rdpm and rdpa fields of this atlas (method: Gunn (2026) Nat Commun "
                    f"doi:10.1038/s41467-026-75466-y, Methods M6); wind data {ds.info['data_citation']}")
    write_variable(root, "qsdiv", np.moveaxis(q, 0, -1), land, {
        "long_name": qa["long_name"], "long_name_latex": qa["long_name_latex"], "units": "m/yr",
        "description": qa["description"], "derived_from": qa["derived_from"], "method": qa["method"],
        "display_units": "m/kyr", "display_scale": 1000.0,
        "source": q_source, "licence": FIELDS_LICENCE_TEXT.get((ds.info or {}).get("fields_license", "CC-BY-4.0"), "CC BY 4.0")})
    del q
    if ai_means is None:
        z = np.load(ai_npz)
        ai_means = {k: z[k] for k in ("ai_mean", "ai_valid_frac", "ai_sat_frac")}
    A = aridity.ATTRIBUTION
    common = {"source": A["source"], "citation": A["citation"], "doi": A["doi"], "licence": A["licence"],
              "url": A["url"], "changes": A["changes"]}
    write_variable(root, "ai_mean", ai_means["ai_mean"], land, {
        "long_name": "Aridity index, mean over the cell", "long_name_latex": r"\overline{\mathrm{AI}}",
        "units": "dimensionless",
        "description": (f"Mean of the valid 30-arc-second Global-AI v3.1 pixels inside the {g.label} cell footprint "
                        f"({g.footprint_text()}), equal weight per pixel (no cos-latitude weighting); undefined where "
                        "none is valid. Includes saturated pixels at 6.5535 (AI ≥ 6.5535), so it is a lower bound where "
                        "ai_sat_frac > 0."), **common})
    write_variable(root, "ai_valid_frac", ai_means["ai_valid_frac"], land, {
        "long_name": "Fraction of the cell footprint with valid aridity data", "long_name_latex": r"f_\mathrm{valid}",
        "units": "1",
        "description": (f"Valid 30″ pixels / {round(abs(g.dlat) * 120 * abs(g.dlon) * 120)} (nominal pixels per {g.label} cell). Pixels outside the source extent "
                        "(south of 60° S) or with no data (ocean, ET0 = 0) count as not valid."), **common})
    write_variable(root, "ai_sat_frac", ai_means["ai_sat_frac"], land, {
        "long_name": "Fraction of valid aridity pixels at saturation (AI ≥ 6.5535)", "long_name_latex": r"f_\mathrm{sat}",
        "units": "1", "description": "Fraction of valid pixels at the source maximum (65535, AI >= 6.5535); undefined where no pixel is valid.",
        **common})
    if not ds.land_only_source:
        with xr.open_dataset(f"{data_dir}/{ds.masks_file}") as M:
            lsm = M["lsm"].values.astype("f4")
        i = ds.info   # lsm_* keys: the land field of a dataset whose mask is not a land-sea mask field (MERRA-2, JRA-3Q)
        write_variable(root, "lsm", lsm, land, {
            "long_name": i.get("lsm_long_name", f"{ds.name} land-sea mask (fraction of land)"), "long_name_latex": r"\mathrm{lsm}",
            "units": "1",
            "description": (i.get("lsm_description", f"{ds.name} land-sea mask, the invariant fraction of the cell covered by land (0–1).")
                            + f" Atlas land cells are those with lsm > {ds.lsm_land_above:g}; other cells have no data."),
            "source": i.get("lsm_source", i["data_citation"]), "citation": i["citation"], "doi": i.get("lsm_doi", i["doi"]),
            "licence": ds.info["licence"], "notice": ds.info.get("copernicus_notice") or ds.info.get("notice", "")})
    return {"objects": count_objects(out), "variables": list(root.attrs["variables"])}
