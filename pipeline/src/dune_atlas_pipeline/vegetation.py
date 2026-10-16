"""Total vegetation cover (MODIS Fractional Cover v3.1, CSIRO; GEOGLAM RAPP), 2001-2025 mean on the 0.1 deg
atlas grid: GeoZarr pyramid `fields/vegetation.zarr`, per-cell sidecar `cells-aux-veg.zarr` and the registry
fragment `registry/earth/generated/x_vegetation.yaml` (docs/reference/sources.md, docs/records/validation-veg.md).

Input: `tot_cov_mean_2001_2025.nc` (latitude 90 -> -90, longitude -180 -> 179.9, cell centres, 0.1 deg), made on
NCI Gadi from the monthly 0.1 deg aggregates of the tc43 tiles (`scripts/veg_gadi.py`):

* `tot_cov_mean` float32 %  - mean of the valid monthly values over the 300 months 2001-01 .. 2025-12
  (months without a valid value are skipped); undefined where no month is valid;
* `n_months` int16          - number of valid monthly values (0 .. 300);
* diagnostics (`tot_cov_std`, `tot_cov_clim12`, `n_calendar_months`, `missing_years_by_month`) - not published.

Values may exceed 100 % slightly: the source fractions sum to 100 % +- 3 % and tot_cov <= 103 is valid.

    python -m dune_atlas_pipeline.vegetation pyramid  --nc STAGING/veg/tot_cov_mean_2001_2025.nc --out STAGING/veg/fields/vegetation.zarr
    python -m dune_atlas_pipeline.vegetation cellsaux --nc ... --out STAGING/veg/cells-aux-veg.zarr [--data DIR]
    python -m dune_atlas_pipeline.vegetation registry                                  # x_vegetation.yaml
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
FRAGMENT = REPO / "registry" / "earth" / "generated" / "x_vegetation.yaml"

VAR = "vegetation"                       # layer id, store name and pyramid array name
TITLE = "Total vegetation cover"
UNITS = "%"
CLIM = [0.0, 100.0]
COLORMAP = "ylgn"                        # sequential yellow (bare) -> green (vegetated)
GROUP = "climate"                        # shown as "Related data" (registry/earth/layers.yaml)
STORE_KEY = "dune-atlas/v1/fields/vegetation.zarr"
AUX_KEY = "dune-atlas/v1/cells-aux-veg.zarr"
MAP_URL = "https://map.geo-rapp.org/"
THREDDS_URL = "https://thredds.nci.org.au/thredds/catalog/tc43/modis-fc/v310/tiles/monthly/cover/catalog.html"
YEARS = (2001, 2025)
N_MONTHS_TOTAL = 12 * (YEARS[1] - YEARS[0] + 1)

# Native 0.1 deg grid: pixel registration, outer cell EDGES (centres 90 - 0.1 i, -180 + 0.1 j)
NY, NX = 1801, 3600
X0, Y0, DX, DY = -180.05, 90.05, 0.1, -0.1
LEVEL_FACTORS = (1, 2, 4, 8, 16)         # as the other 0.1 deg fields: trailing partial windows trimmed

ATTRIBUTION = {
    "source": ("Fractional cover - MODIS, CSIRO Land and Water algorithm, Version 3.1.0 (CSIRO; MODIS MCD43A4 "
               "collection 6/6.1, monthly medoid, 500 m): total vegetation cover (photosynthetic + "
               "non-photosynthetic vegetation), 2001–2025; the vegetation product of GEOGLAM Rangeland and Pasture "
               "Productivity (RAPP), hosted by NCI"),
    "citation": ("Guerschman, J.P. et al. (2015) Assessing the effects of site heterogeneity and soil properties when "
                 "unmixing photosynthetic vegetation, non-photosynthetic vegetation and bare soil fractions from "
                 "Landsat and MODIS data. Remote Sensing of Environment 161, 12-26. doi:10.1016/j.rse.2015.01.021; "
                 "Guerschman, J.P. & Hill, M.J. (2018) Calibration and validation of the Australian fractional cover "
                 "product for MODIS collection 6. Remote Sensing Letters 9, 696-705. doi:10.1080/2150704X.2018.1465611; "
                 "data: Guerschman, J. (2014) Fractional cover - MODIS, CSIRO algorithm. CSIRO. "
                 "doi:10.4225/08/5848a3f19a7b3"),
    "doi": "10.4225/08/5848a3f19a7b3",
    "licence": "CC BY 4.0, © 2008–2019 CSIRO",
    "url": MAP_URL,
    "changes": ("Processed for the atlas: monthly 500 m tiles averaged to 0.1° and over 2001–2025 (valid tot_cov "
                "≤ 103 %; months without valid data skipped); zoomed-out map views show means of the valid 0.1° "
                "cells; values rounded to a relative precision of 1.2e-4."),
}

DESCRIPTION = (   # shortened for the info popover; source, licence and processing are attribution rows
    "Mean total vegetation cover (green plus dry vegetation, including trees; % of the ground), 2001–2025, from the "
    "CSIRO MODIS Fractional Cover v3.1 (500 m, monthly) averaged onto the 0.1° cells over the months with valid data. "
    "Calibrated against Australian field sites; saturates under closed canopies. "
    "Total cover includes non-photosynthetic vegetation (dry and dead plant material) as well as green vegetation, "
    "so it can be substantial where little green vegetation is visible. "
    "No data over ocean, Antarctica, "
    "land north of 70° N and the 180° meridian cells. "
    f"[Explore the full monthly time series at GEOGLAM RAPP]({MAP_URL}).")


def var_attrs() -> dict:
    a = ATTRIBUTION
    return {
        "long_name": TITLE, "units": UNITS, "valid_min": 0.0, "valid_max": 103.0,
        "description": ("Mean of the valid monthly total vegetation cover values (PV + NPV, %) on the 0.1° grid over "
                        "2001-01 .. 2025-12; undefined (no data) where no month has a valid value. Values up to "
                        "103 % are valid (the source fractions sum to 100 % +- 3 %)."),
        "colormap": COLORMAP, "clim": CLIM, "log_scale": False, "display_transform": "none", "cyclic": False,
        "resampling": "count-weighted-mean",
        "source": a["source"], "citation": a["citation"], "doi": a["doi"], "licence": a["licence"], "url": a["url"],
        "data_access": THREDDS_URL,
    }


# ----------------------------------------------------------------------------- input
def load(nc_path) -> tuple[np.ndarray, np.ndarray]:
    """(tot_cov_mean float32 (1801, 3600) with NaN = undefined, n_months int16). Checks the grid."""
    import netCDF4
    with netCDF4.Dataset(nc_path) as d:
        lat = np.asarray(d["latitude"][:], "f8"); lon = np.asarray(d["longitude"][:], "f8")
        assert lat.shape == (NY,) and lon.shape == (NX,)
        assert np.allclose(lat, 90 - 0.1 * np.arange(NY), atol=1e-6), "latitude grid"
        assert np.allclose(lon, -180 + 0.1 * np.arange(NX), atol=1e-6), "longitude grid"
        m = np.asarray(d["tot_cov_mean"][:].filled(np.nan), "f4")
        n = np.asarray(d["n_months"][:].filled(0), "i2")
    assert ((n == 0) == ~np.isfinite(m)).all(), "mean defined iff n_months > 0"
    assert n.max() <= N_MONTHS_TOTAL
    return m, n


# ----------------------------------------------------------------------------- pyramid
def level_transform(f: int) -> list[float]:
    """Exact cell-edge transform of level factor f: [dx, 0, x0, 0, dy, y0] with rounded decimals."""
    return [round(f * DX, 10), 0.0, X0, 0.0, round(f * DY, 10), Y0]


def coarse_levels(arr: np.ndarray, factors=LEVEL_FACTORS) -> dict[int, np.ndarray]:
    """{f: count-weighted nan-mean of f x f native windows}, trailing partial windows trimmed (same shapes as
    the other 0.1 deg fields: 900 x 1800, 450 x 900, 225 x 450, 112 x 225)."""
    fin = np.isfinite(arr)
    out = {}
    for f in factors:
        if f == 1:
            out[f] = arr.astype("f4")
            continue
        ny, nx = arr.shape[0] // f, arr.shape[1] // f
        s = np.where(fin, arr, 0).astype("f8")[: ny * f, : nx * f].reshape(ny, f, nx, f).sum((1, 3))
        c = fin[: ny * f, : nx * f].reshape(ny, f, nx, f).sum((1, 3))
        with np.errstate(invalid="ignore", divide="ignore"):
            out[f] = np.where(c > 0, s / np.maximum(c, 1), np.nan).astype("f4")
    return out


def build_pyramid(nc_path, out, keepbits: int = 12, chunk: int = 512, shard_chunks: int = 8) -> dict:
    import zarr
    from .fields import bitround, _du
    from .nativepyramid import CONVENTIONS, _sharded_float_array, wkt2_4326
    t0 = time.time()
    arr, n = load(nc_path)
    levels = coarse_levels(arr)
    wkt = wkt2_4326()
    a = ATTRIBUTION
    root_attrs = {
        "title": f"dune-atlas field: {TITLE}, 2001-2025 mean, 0.1 degree grid",
        "source": f"{a['source']}. {a['citation']}",
        "license": "CC-BY-4.0", "attribution": a, "data_access": THREDDS_URL, "time_series": MAP_URL,
        "dune_atlas:resampling": "count-weighted nan-mean of valid 0.1 degree cells per f x f window (all levels from level 0)",
        "dune_atlas:threshold_independent": True,
        "dune_atlas:period": "2001-01/2025-12 (300 months)",
    }
    proj_attrs = {"zarr_conventions": [CONVENTIONS[1]], "proj:code": "EPSG:4326", "proj:wkt2": wkt}
    root = zarr.open_group(out, mode="w", zarr_format=3)
    layout, stats = [], []
    va = var_attrs()
    for li, f in enumerate(LEVEL_FACTORS):
        data = levels[f]
        if keepbits is not None and keepbits < 23:
            data = bitround(data, keepbits)
        ly, lx = data.shape
        g = root.create_group(str(li), overwrite=True)
        g.attrs.update({"title": root_attrs["title"], "source": root_attrs["source"], "license": "CC-BY-4.0",
                        "coordinates": "spatial_ref", **proj_attrs, "dune_atlas:level_factor": f})
        _sharded_float_array(g, VAR, data, chunk, shard_chunks, {**va, "coordinates": "spatial_ref"}, ["y", "x"])
        tr = level_transform(f)
        xs = np.round(X0 + (np.arange(lx) + 0.5) * tr[0], 10)
        ys = np.round(Y0 + (np.arange(ly) + 0.5) * tr[4], 10)
        for name, vals, extra in (("x", xs, {"units": "degrees_east", "standard_name": "longitude"}),
                                  ("y", ys, {"units": "degrees_north", "standard_name": "latitude"})):
            c = g.create_array(name, shape=vals.shape, dtype="float64", chunks=vals.shape, fill_value=np.nan,
                               dimension_names=[name], attributes={**extra, "dune_atlas:position": "cell centre"},
                               overwrite=True)
            c[...] = vals
        sr = g.create_array("spatial_ref", shape=(), dtype="int64", fill_value=0,
                            attributes={"crs_wkt": wkt, "spatial_ref": wkt}, overwrite=True)
        sr[...] = 0
        entry = {"asset": str(li)}
        if f > 1:
            entry.update({"derived_from": "0", "transform": {"scale": [float(f), float(f)],
                                                             "translation": [(f - 1) / 2, (f - 1) / 2]},
                          "resampling_method": "mean"})
        entry.update({"spatial:transform": tr, "spatial:shape": [ly, lx]})
        layout.append(entry)
        stats.append({"level": li, "factor": f, "shape": [ly, lx], "finite": int(np.isfinite(data).sum())})
    root.attrs.update({
        **root_attrs, "zarr_conventions": CONVENTIONS, "proj:code": "EPSG:4326", "proj:wkt2": wkt,
        "spatial:dimensions": ["y", "x"], "spatial:registration": "pixel",
        "spatial:transform": level_transform(1), "spatial:bbox": [X0, round(Y0 + NY * DY, 10), round(X0 + NX * DX, 10), Y0],
        "spatial:shape": [NY, NX], "zarr-layer": {VAR: {"clim": CLIM, "colormap": COLORMAP}},
        "multiscales": {"layout": layout, "resampling_method": "mean"},
    })
    out_stats = {"var": VAR, "levels": stats, "factors": list(LEVEL_FACTORS), "keepbits": keepbits,
                 "chunk": chunk, "bytes": _du(out), "total_s": round(time.time() - t0, 1)}
    if keepbits is not None and keepbits < 23:
        fin = np.isfinite(arr) & (arr > 0)
        r = bitround(arr, keepbits)
        out_stats["keepbits_max_rel_err"] = float((np.abs(r[fin].astype("f8") - arr[fin]) / arr[fin]).max())
        out_stats["keepbits_max_abs_err_pct"] = float(np.nanmax(np.abs(r.astype("f8") - arr)))
        out_stats["keepbits_zero_preserved"] = bool((r[arr == 0] == 0).all())
    return out_stats


# ----------------------------------------------------------------------------- per-cell sidecar
AUX_CONVENTION = (
    "Additive per-cell sidecars: each later group of per-cell variables is published as its own store "
    "dune-atlas/<version>/cells-aux-<name>.zarr on the cells.zarr grid, with the cells-aux.zarr layout (scalar "
    "arrays (latitude, longitude) float32 in plain 64 x 64 chunks; threshold-dependent arrays (latitude, longitude, "
    "ut) sharded 16 x 16 cells with a 1-cell inner chunk, index at the end; only cells.zarr land cells carry values; "
    "all-ocean chunks absent). Published stores are never rewritten; a later version may consolidate the sidecars "
    "into one cells-aux.zarr.")


def build_cells_aux(out, nc_path, data_dir) -> dict:
    """cells-aux-veg.zarr: `tot_cov_mean` (%), `tot_cov_n_months` (count) on land cells (layers.nc land)."""
    import xarray as xr
    from . import cellsaux as CA
    m, n = load(nc_path)
    with xr.open_dataset(f"{data_dir}/layers.nc") as L:
        land = L["land"].values.astype(bool)
    assert land.shape == (NY, NX)
    root = CA.open_store(out, land, root_attrs={
        "title": "dune-atlas per-cell vegetation cover (sidecar to cells.zarr)",
        "conventions": ("scalar arrays: (latitude, longitude), plain 64x64 chunks; missing values (fill value NaN): "
                        "ocean, outside the source coverage, or no valid month"),
        "sidecar_of": "cells.zarr", "sidecar_convention": AUX_CONVENTION,
        "license": "CC-BY-4.0", "attribution": ATTRIBUTION, "data_access": THREDDS_URL, "time_series": MAP_URL,
    })
    a = ATTRIBUTION
    common = {"source": a["source"], "citation": a["citation"], "doi": a["doi"], "licence": a["licence"],
              "url": a["url"], "changes": a["changes"]}
    CA.write_variable(root, "tot_cov_mean", m, land, {
        "long_name": "Total vegetation cover, mean 2001-2025", "long_name_latex": r"\overline{V}", "units": "%",
        "description": ("Mean of the valid monthly total vegetation cover values (photosynthetic + non-photosynthetic "
                        "vegetation, MODIS Fractional Cover v3.1) in the 0.1° cell over 2001-01 .. 2025-12; months "
                        "without a valid value are skipped; undefined (no data) where no month is valid. Values up "
                        "to 103 % are valid (fractions sum to 100 % ± 3 %)."), **common})
    nf = n.astype("f4")
    CA.write_variable(root, "tot_cov_n_months", nf, land, {
        "long_name": "Number of months with valid vegetation cover, 2001-2025", "long_name_latex": r"n_\mathrm{months}",
        "units": "1", "valid_max": float(N_MONTHS_TOTAL),
        "description": ("Number of the 300 months 2001-01 .. 2025-12 with a valid 0.1° monthly value (0 outside "
                        "the source coverage; fewer at high latitudes because of snow, cloud and polar night)."),
        **common})
    return {"objects": CA.count_objects(out), "variables": list(root.attrs["variables"]),
            "land_cells": int(land.sum()), "land_defined": int((land & np.isfinite(m)).sum())}


def build_cells_aux_regridded(out, nc_path, data_dir, dataset="era5") -> dict:
    """cells-aux-veg.zarr for a coarser wind grid (ERA5 0.25°): `tot_cov_mean` = area-weighted mean of the valid
    0.1° tot_cov_mean values over the cell footprint (exact spherical overlap areas, cellmasks.Regrid), and
    `tot_cov_valid_frac` = valid fraction of the footprint area; on the dataset's land cells."""
    from . import cellsaux as CA
    from .cellmasks import Regrid
    from .cellstore import load_masks
    from .grid import ERA5_LAND_GRID, get_dataset
    ds = get_dataset(dataset)
    g = ds.grid
    m, _ = load(nc_path)
    land = load_masks(data_dir, ds)[0]
    mean, vfrac = Regrid(g, ERA5_LAND_GRID).area_weighted_mean(m)
    root = CA.open_store(out, land, dataset=ds, root_attrs={
        "title": "dune-atlas per-cell vegetation cover (sidecar to cells.zarr)",
        "conventions": ("scalar arrays: (latitude, longitude), plain 64x64 chunks; the fill value marks cells with no "
                        "data: not land, outside the source coverage, or no valid month"),
        "sidecar_of": "cells.zarr", "sidecar_convention": AUX_CONVENTION,
        "license": "CC-BY-4.0", "attribution": ATTRIBUTION, "data_access": THREDDS_URL, "time_series": MAP_URL,
        "regridding": (f"area-weighted mean of the 0.1° atlas vegetation cells over each {g.label} cell footprint "
                       f"({g.footprint_text()}), exact spherical overlap areas"),
    })
    a = ATTRIBUTION
    changes = a["changes"].replace("zoomed-out map views show means of the valid 0.1° cells; ",
                                   f"{g.label} cell values are area-weighted means of the valid 0.1° cells; ")
    common = {"source": a["source"], "citation": a["citation"], "doi": a["doi"], "licence": a["licence"],
              "url": a["url"], "changes": changes}
    CA.write_variable(root, "tot_cov_mean", mean, land, {
        "long_name": "Total vegetation cover, mean 2001-2025", "long_name_latex": r"\overline{V}", "units": "%",
        "description": (f"Area-weighted mean over the {g.label} cell footprint of the 0.1° mean total vegetation cover "
                        "(photosynthetic + non-photosynthetic vegetation, MODIS Fractional Cover v3.1, valid months "
                        "2001-01 .. 2025-12), using the 0.1° cells with a value; a regrid of the 0.1° product. "
                        "Undefined (no data) where no 0.1° cell in the footprint has a value."), **common})
    CA.write_variable(root, "tot_cov_valid_frac", vfrac, land, {
        "long_name": "Fraction of the cell footprint with vegetation cover data", "long_name_latex": r"f_\mathrm{valid}",
        "units": "1", "valid_min": 0.0, "valid_max": 1.0,
        "description": (f"Area fraction of the {g.label} cell footprint covered by 0.1° cells with a valid mean "
                        "vegetation cover (0 outside the source coverage)."), **common})
    return {"objects": CA.count_objects(out), "variables": list(root.attrs["variables"]),
            "land_cells": int(land.sum()), "land_defined": int((land & np.isfinite(mean)).sum())}


# ----------------------------------------------------------------------------- registry
def registry_layer() -> dict:
    a = ATTRIBUTION
    return {
        "id": VAR, "title": TITLE, "titleTex": "Total vegetation cover $V$", "group": GROUP,
        "type": "zarr-field", "source": STORE_KEY, "variable": VAR, "thresholdAware": False, "units": UNITS,
        "description": DESCRIPTION,
        "citation": (f"{a['citation']} ({a['licence']}). GEOGLAM RAPP Map: {MAP_URL}"),
        "attribution": dict(a),
        "visible": False, "opacity": 0.85, "queryable": False,
        "display": {"transform": "none", "colormap": COLORMAP, "clim": list(CLIM), "log": False,
                    # (no legendNote: stated once, in the info)
                    "ticks": [0, 20, 40, 60, 80, 100], "topLabel": "≥ 100"},
    }


def fragment() -> dict:
    return {"layers": [registry_layer()]}


def write_fragment(path=FRAGMENT) -> Path:
    import yaml
    path = Path(path)
    header = ("# GENERATED by `python -m dune_atlas_pipeline.vegetation registry` (vegetation.registry_layer).\n"
              "# Do not edit by hand. Fragment {layers}: one 2-D zarr-field layer (no u*,th dimension) in the\n"
              "# group `climate` defined in registry/earth/layers.yaml / x_extra_fields.yaml.\n")
    path.write_text(header + yaml.safe_dump(fragment(), sort_keys=False, allow_unicode=True, width=110))
    return path


def main(argv=None):
    import argparse
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.vegetation")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("pyramid"); b.add_argument("--nc", required=True); b.add_argument("--out", required=True)
    b.add_argument("--keepbits", type=int, default=12)
    c = sub.add_parser("cellsaux"); c.add_argument("--nc", required=True); c.add_argument("--out", required=True)
    c.add_argument("--data", default=os.environ.get("DUNE_WORLD_DATA", ""))
    c.add_argument("--dataset", default="era5-land", choices=["era5-land", "era5", "merra2", "jra3q"])
    sub.add_parser("registry")
    a = p.parse_args(argv)
    if a.cmd == "pyramid":
        print(json.dumps(build_pyramid(a.nc, a.out, keepbits=a.keepbits)))
    elif a.cmd == "cellsaux":
        print(json.dumps(build_cells_aux(a.out, a.nc, a.data) if a.dataset == "era5-land" else
                         build_cells_aux_regridded(a.out, a.nc, a.data, a.dataset)))
    else:
        print(write_fragment())


if __name__ == "__main__":
    main()
