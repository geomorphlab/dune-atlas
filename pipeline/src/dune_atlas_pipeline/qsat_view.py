"""View of era5-land_1950_2024_qsat_params.zarr used by the atlas.

`open_qsat(data_dir)` returns the 23 qsat variables. Six are derived lazily (dask) on access, so
that every field follows the definitions in the descriptions below:

  dpm, rdpm, rdpa : drift potential DP, resultant drift potential RDP and resultant drift direction
                    RDD of the time-averaged flat-bed saturated flux (sums over all speed and
                    direction bins, weighted by the hours in each bin), read from the drift store
                    written by scripts/drift/compute_drift.py ($DUNE_ATLAS_DRIFT,
                    default staging/drift/qsat_drift.zarr)
  qha_rdp_dp      : RDP / DP where DP > 0; NaN (undefined) where DP = 0
  qhbf, qhef      : fraction of bed- / elongation-mode crest flux while the flat-bed u* exceeds
                    threshold, F = (source qhbf / qhef) * uft where uft > 0; F = 0 where uft == 0 and
                    crest flux exists (qalb + qacb > 0 | qale + qace > 0); NaN where there is no
                    crest flux (and off land)

All other variables are read from the source unchanged. `open_source()` returns the source store.

Other wind datasets (grid.DATASETS, `qsat_is_atlas=True`, e.g. ERA5): the qsat store written by
`qsat_compute.py` already holds the time-averaged definitions above, so `open_qsat(..., dataset="era5")` returns its
23 variables unchanged.
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import xarray as xr

REPO = Path(__file__).resolve().parents[3]
SOURCE_NAME = "era5-land_1950_2024_qsat_params.zarr"
DRIFT_STORE = Path(os.environ.get("DUNE_ATLAS_DRIFT", REPO / "staging" / "drift" / "qsat_drift.zarr"))

FRACTION_VARS = ("qhbf", "qhef")
DRIFT_VARS = ("dpm", "rdpm", "rdpa", "qha_rdp_dp")
DERIVED_VARS = FRACTION_VARS + DRIFT_VARS

_ATTRS = {
    "qhbf": dict(
        long_name="Fraction of bed-mode flux while flat-bed $u_{\\ast,f}>u_{\\ast,th}$",
        description="Fraction of bed-mode (migration-mode, $\\alpha_H$) crest flux that occurs while the flat-bed "
                    "friction velocity exceeds threshold, $\\sum_{u_{\\ast,f}>u_{\\ast,th}} n|Q(\\alpha_H)| / \\sum n|Q(\\alpha_H)|$. "
                    "0 where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux.",
        units="-"),
    "qhef": dict(
        long_name="Fraction of elongation-mode flux while flat-bed $u_{\\ast,f}>u_{\\ast,th}$",
        description="Fraction of elongation-mode ($\\alpha_E$) crest flux that occurs while the flat-bed friction "
                    "velocity exceeds threshold, $\\sum_{u_{\\ast,f}>u_{\\ast,th}} n|Q(\\alpha_E)| / \\sum n|Q(\\alpha_E)|$. "
                    "0 where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux.",
        units="-"),
    "dpm": dict(
        long_name="Drift potential $DP$",
        description="Time-averaged flat-bed saturated flux magnitude, $DP = \\sum n q / \\sum n$ over all speed and direction bins, in m$^2$/s.",
        units="m$^2$/s"),
    "rdpm": dict(
        long_name="Resultant drift potential $RDP$",
        description="Magnitude of the time-averaged flat-bed flux vector, $RDP = |\\sum n q e^{i\\theta}| / \\sum n$, in m$^2$/s.",
        units="m$^2$/s"),
    "rdpa": dict(
        long_name="Resultant drift direction $RDD$",
        description="Direction of the time-averaged flat-bed flux vector, $\\arg \\sum n q e^{i\\theta}$, radians CCW from east, "
                    "direction of transport.",
        units="rad"),
    "qha_rdp_dp": dict(
        long_name="$RDP/DP$",
        description="Directional variability of sand flux: ratio of resultant to total drift potential, $RDP/DP$ "
                    "(0 = multidirectional, 1 = unidirectional). Undefined where there is no sand flux ($DP = 0$).",
        units="-"),
}


def open_source(data_dir, chunks=None, dataset=None) -> xr.Dataset:
    from .grid import get_dataset
    name = SOURCE_NAME if dataset is None else get_dataset(dataset).qsat_store
    return xr.open_zarr(f"{data_dir}/{name}", consolidated=False, chunks=chunks)


def open_qsat(data_dir, chunks=None, drift_store=None, dataset=None) -> xr.Dataset:
    """23-variable qsat Dataset. Variables read from the source use `chunks` as given (None = lazy
    numpy backend); derived variables are dask arrays on the source's 64^3 chunks (computed on access)."""
    from .grid import get_dataset
    dset = get_dataset(dataset)
    if dset.qsat_is_atlas:
        from .constants import QSAT_VARS
        return open_source(data_dir, chunks=chunks, dataset=dset)[QSAT_VARS]
    ds = open_source(data_dir, chunks=chunks)
    src = open_source(data_dir, chunks={})                      # dask, native chunks
    dr = xr.open_zarr(str(drift_store or DRIFT_STORE), consolidated=False, chunks={})
    dr = dr.assign_coords(ut=src.ut, latitude=src.latitude, longitude=src.longitude)
    new = {}
    for v, a, b in (("qhbf", "qalb", "qacb"), ("qhef", "qale", "qace")):
        u = src.uft
        crest = (src[a] + src[b]) > 0
        f = xr.where(u > 0, src[v] * u, xr.where(crest, 0.0, np.nan)).where(np.isfinite(u))
        new[v] = f.clip(0.0, 1.0)  # removes rounding overshoot (max 1 + 2e-16)
    dp = dr.dp.astype("float64"); rdp = dr.rdp.astype("float64")
    new["dpm"] = dp
    new["rdpm"] = rdp
    new["rdpa"] = dr.rdd.astype("float64")
    new["qha_rdp_dp"] = xr.where(dp > 0, rdp / dp, np.nan).where(np.isfinite(dp))
    for v, da in new.items():
        da = da.transpose("ut", "latitude", "longitude")
        da.attrs = {**ds[v].attrs, **_ATTRS[v], "_ARRAY_DIMENSIONS": None}
        da.attrs.pop("_ARRAY_DIMENSIONS")
        da.encoding = {}
        ds[v] = da
    return ds
