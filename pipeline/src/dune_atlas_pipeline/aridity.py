"""Global Aridity Index (Global-AI_PET v3.1) at native 30-arc-second resolution, plus per-cell means on a
wind grid (docs/reference/sources.md, docs/reference/data-audit.md "Aridity index").

Source: `ai_v31_yr.tif` (43200 x 18000, 90N-60S, 180W-180E, UInt16 = AI x 10^4, no declared nodata) and
`Global-AI_ET0__annual_v3_1/et0_v31_yr.tif` (same grid, UInt16 mm/yr, nodata 65535).

Encoding decisions (measured 2026-10-13 over all 777,600,000 pixels; see `decode_counts`):

* **Ocean / no data.** `ai == 0` is used both for "no data" (ocean, Antarctica is outside the grid) and for
  genuinely hyper-arid pixels. The ET0 raster carries a proper nodata (65535), and every one of its
  555,472,356 nodata pixels has `ai == 0` (and no pixel with `ai > 0` is ET0-nodata). So: **ET0 nodata -> NaN**.
* **ET0 = 0** (120,195 pixels, all polar ice: Svalbard, Canadian Arctic, Greenland): AI = P/ET0 is
  undefined; the source writes 0 (88,054 px) or 65535 (32,141 px). -> **NaN** (undefined, not hyper-arid).
* **Genuine zeros.** `ai == 0` with ET0 > 0 (234,618 px; eastern Sahara/Libyan desert, Atacama): AI < 5e-5
  (P ~ 0), kept as **0.0** (hyper-arid). No pixel has ai = 1 or 2; the smallest positive value is 3.
* **65535 = saturation.** 1,170,922 px with ET0 > 0 (high-latitude/high-mountain, median ET0 15 mm/yr) hold
  65535, while counts in 60000..65534 are ~30 per value: the integer AI is clipped at the UInt16 maximum.
  Kept as **6.5535, meaning AI >= 6.5535** (a censored lower bound; always far inside the UNEP "humid"
  class > 0.65). Means over windows containing saturated pixels are lower bounds too; the per-cell
  `ai_sat_frac` reports the saturated share.

Values: float32 AI = uint16 x 1e-4 (computed in float64, then cast).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

import numpy as np

AI_FILE = "ai_v31_yr.tif"
ET0_FILE = "Global-AI_ET0__annual_v3_1/et0_v31_yr.tif"
SCALE = 1e-4
SATURATED_RAW = 65535
SATURATED_VALUE = 6.5535
ET0_NODATA = 65535
# Native grid (pixel registration; edges): 30 arc-seconds
X0, Y0, DX, DY = -180.0, 90.0, 1.0 / 120, -1.0 / 120
NY, NX = 18000, 43200

UNEP_CLASSES = [  # (upper bound, name); UNEP (1997) as tabulated in the Global-AI v3.1 readme
    (0.03, "hyper-arid"), (0.2, "arid"), (0.5, "semi-arid"), (0.65, "dry sub-humid"), (float("inf"), "humid")]

ATTRIBUTION = {
    "source": "Global Aridity Index and Potential Evapotranspiration (ET0) Database, Version 3.1 "
              "(Global-AI_PET v3.1; Zomer & Trabucco), annual aridity index ai_v31_yr, 1970-2000, 30 arc-seconds",
    "citation": "Zomer, R.J., Xu, J. & Trabucco, A. (2022) Version 3 of the Global Aridity Index and Potential "
                "Evapotranspiration Database. Scientific Data 9, 409. doi:10.1038/s41597-022-01493-1",
    "doi": "10.6084/m9.figshare.7504448.v7",
    "licence": "CC BY 4.0",
    "url": "https://figshare.com/articles/dataset/Global_Aridity_Index_and_Potential_Evapotranspiration_ET0_Climate_Database_v2/7504448",
    "changes": "Processed for the atlas: source integers (AI x 10^4) converted to decimal AI; ocean (no ET0 "
               "data) and ET0 = 0 pixels set to no data; the source maximum 65535 kept as 6.5535 (AI >= 6.5535); "
               "zoomed-out map views show means of the valid native pixels; values rounded to a relative "
               "precision of 1.2e-4.",
}


def _read_band(path):
    import rasterio
    with rasterio.open(path) as r:
        assert (r.width, r.height) == (NX, NY), (r.width, r.height)
        t = r.transform
        assert abs(t.a - DX) < 1e-12 and abs(t.e - DY) < 1e-12 and abs(t.c - X0) < 1e-9 and abs(t.f - Y0) < 1e-9, t
        return r.read(1)


def decode(ai: np.ndarray, et0: np.ndarray):
    """(ai uint16, et0 uint16) -> (AI float32 with NaN no data, saturated bool, counts dict). See module doc."""
    assert ai.dtype == np.uint16 and et0.dtype == np.uint16 and ai.shape == et0.shape
    nod = et0 == ET0_NODATA
    e0 = et0 == 0
    z = ai == 0
    s = ai == SATURATED_RAW
    undefined = nod | e0
    counts = {
        "pixels": int(ai.size),
        "ocean_nodata_et0_nodata": int(nod.sum()),
        "ocean_nodata_with_ai_nonzero": int((nod & ~z).sum()),
        "et0_zero_ai0_to_nan": int((e0 & z).sum()),
        "et0_zero_ai65535_to_nan": int((e0 & s).sum()),
        "genuine_zero_kept": int((z & ~undefined).sum()),
        "saturated_kept_6.5535": int((s & ~undefined).sum()),
    }
    out = (ai.astype("f8") * SCALE).astype("f4")
    out[undefined] = np.nan
    sat = s & ~undefined
    counts["valid"] = int(np.isfinite(out).sum())
    return out, sat, counts


def load(data_dir):
    """Native AI float32 (18000, 43200), saturated mask, decode counts."""
    ai = _read_band(Path(data_dir) / AI_FILE)
    et0 = _read_band(Path(data_dir) / ET0_FILE)
    return decode(ai, et0)


# ----------------------------------------------------------------------------- per-cell means on a target grid
def overlap_weights(src_edge0: float, src_step: float, n_src: int, centres: np.ndarray, half_width: float,
                    periodic: bool = False):
    """Sparse (len(centres), n_src) matrix: overlap of each target cell [c - hw, c + hw] with each source
    pixel, in units of source pixels (a fully covered pixel = 1). Source pixel k spans
    [src_edge0 + k*step, src_edge0 + (k+1)*step] (step may be negative). `periodic` wraps source indices
    (longitude). Positions are rounded to 1e-9 pixel so exact grid alignments give exact weights."""
    import scipy.sparse as sp
    a = (centres - half_width - src_edge0) / src_step
    b = (centres + half_width - src_edge0) / src_step
    lo, hi = np.minimum(a, b), np.maximum(a, b)
    lo, hi = np.round(lo, 9), np.round(hi, 9)
    rows, cols, vals = [], [], []
    for i, (u, v) in enumerate(zip(lo, hi)):
        k0, k1 = int(np.floor(u)), int(np.ceil(v))
        ks = np.arange(k0, k1)
        w = np.minimum(v, ks + 1) - np.maximum(u, ks)
        keep = w > 0
        ks, w = ks[keep], w[keep]
        if periodic:
            ks = ks % n_src
        else:
            inside = (ks >= 0) & (ks < n_src)
            ks, w = ks[inside], w[inside]
        rows.extend([i] * len(ks)); cols.extend(ks.tolist()); vals.extend(w.tolist())
    return sp.csr_matrix((vals, (rows, cols)), shape=(len(centres), n_src))


def cell_means(values: np.ndarray, flags: dict[str, np.ndarray] | None = None, *, lat_centres: np.ndarray,
               lon_centres: np.ndarray, dlat: float, dlon: float, x0: float = X0, y0: float = Y0,
               dx: float = DX, dy: float = DY, band: int = 1200) -> dict[str, np.ndarray]:
    """Mean of a fine regular grid over each target cell footprint (target centres +- dlat/2, +- dlon/2;
    longitude periodic). Generic in the target grid (ERA5-Land 0.1 deg, ERA5 0.25 deg, ...).

    Weights are the fractional overlap of each fine pixel with the footprint (1 for fully covered pixels;
    equal per pixel, i.e. no cos(lat) weighting inside a cell - for 30" pixels in a 0.1 deg cell the area
    variation across the cell is < 0.2 % except within 1 deg of the poles).
    Returns float32 arrays (ny_t, nx_t):
      mean        sum(w x finite) / sum(w over finite), NaN where no finite pixel;
      valid_frac  sum(w over finite) / nominal footprint (dlat/|dy|)(dlon/dx) - pixels outside the fine grid's
                  extent (e.g. south of 60 S, north of 90 N for the row centred on 90) count as not valid;
      <flag>_frac for each boolean flag array: sum(w x flag) / sum(w over finite) (NaN where no finite)."""
    flags = flags or {}
    ny, nx = values.shape
    Wy = overlap_weights(y0, dy, ny, np.asarray(lat_centres, "f8"), dlat / 2)
    Wx = overlap_weights(x0, dx, nx, np.asarray(lon_centres, "f8"), dlon / 2, periodic=True)
    WxT = Wx.T.tocsr()
    nt_y = len(lat_centres)
    acc = {k: np.zeros((nt_y, len(lon_centres)), "f8") for k in ["s", "n", *flags]}
    for r0 in range(0, ny, band):
        r1 = min(ny, r0 + band)
        Wb = Wy[:, r0:r1]
        rows = np.unique(Wb.nonzero()[0])
        if not len(rows):
            continue
        Wb = Wb[rows]
        v = values[r0:r1]
        fin = np.isfinite(v)
        acc["s"][rows] += (Wb @ np.where(fin, v, 0).astype("f8")) @ WxT
        acc["n"][rows] += (Wb @ fin.astype("f8")) @ WxT
        for k, m in flags.items():
            acc[k][rows] += (Wb @ (m[r0:r1] & fin).astype("f8")) @ WxT
    nominal = (dlat / abs(dy)) * (dlon / dx)
    n = acc["n"]
    with np.errstate(invalid="ignore", divide="ignore"):
        out = {"mean": np.where(n > 0, acc["s"] / n, np.nan).astype("f4"),
               "valid_frac": (n / nominal).astype("f4")}
        for k in flags:
            out[f"{k}_frac"] = np.where(n > 0, acc[k] / n, np.nan).astype("f4")
    return out


def wind_grid_means(ai: np.ndarray, sat: np.ndarray, *, lat0=90.0, dlat=0.1, ny=1801, lon0=-180.0, dlon=0.1, nx=3600):
    """AI means on a cell-centred grid lat0 - dlat*i, lon0 + dlon*j (defaults: ERA5-Land 0.1 deg, 1801 x 3600;
    ERA5 0.25 deg: dlat=dlon=0.25, ny=721, nx=1440). Returns {ai_mean, ai_valid_frac, ai_sat_frac}."""
    lat = np.round(lat0 - dlat * np.arange(ny), 9)
    lon = np.round(lon0 + dlon * np.arange(nx), 9)
    r = cell_means(ai, {"sat": sat}, lat_centres=lat, lon_centres=lon, dlat=dlat, dlon=dlon)
    return {"ai_mean": r["mean"], "ai_valid_frac": r["valid_frac"], "ai_sat_frac": r["sat_frac"]}


# ----------------------------------------------------------------------------- pyramid + registry
VAR = "aridity"
TITLE = "Aridity index (AI)"
CLIM = [0.003, 6.5]           # log display; spans hyper-arid (< 0.03) to saturated humid (6.5535)
COLORMAP = "brbg"             # brown = arid -> blue-green = humid


def var_attrs() -> dict:
    return {
        "long_name": TITLE, "long_name_latex": r"\mathrm{AI}",
        "description": ("Mean annual precipitation / mean annual reference evapotranspiration (FAO-56 "
                        "Penman-Monteith ET0), 1970-2000. UNEP classes: < 0.03 hyper-arid, 0.03-0.2 arid, "
                        "0.2-0.5 semi-arid, 0.5-0.65 dry sub-humid, > 0.65 humid. 6.5535 means AI >= 6.5535 "
                        "(source saturation); NaN = ocean / no data / undefined (ET0 = 0)."),
        "units": "dimensionless", "valid_min": 0.0, "saturation_value": SATURATED_VALUE,
        "saturation_meaning": "AI >= 6.5535 (source UInt16 maximum 65535)",
        "unep_classes": [[b if np.isfinite(b) else None, n] for b, n in UNEP_CLASSES],
        "colormap": COLORMAP, "clim": CLIM, "log_scale": True, "display_transform": "none", "cyclic": False,
        "resampling": "count-weighted-mean",
        "source": ATTRIBUTION["source"], "licence": ATTRIBUTION["licence"], "doi": ATTRIBUTION["doi"],
    }


def build_pyramid(data_dir, out, keepbits=12, chunk=512, shard_chunks=8, factors=None) -> dict:
    from .nativepyramid import common_factors, write_native_pyramid
    t0 = time.time()
    ai, sat, counts = load(data_dir)
    t_read = time.time() - t0
    factors = factors or common_factors(NY, NX)
    root_attrs = {
        "title": f"dune-atlas field: {TITLE}, native 30 arc-second grid",
        "source": ATTRIBUTION["citation"] + "; data doi:" + ATTRIBUTION["doi"],
        "license": "CC-BY-4.0",
        "attribution": ATTRIBUTION,
        "dune_atlas:decode": {"ocean_nodata": "et0_v31_yr == 65535 -> NaN", "et0_zero": "-> NaN (undefined)",
                              "ai_zero_with_et0_gt_0": "kept 0 (hyper-arid)",
                              "ai_65535": "kept 6.5535 (AI >= 6.5535)", "counts": counts},
        "dune_atlas:resampling": "count-weighted nan-mean of native pixels per f x f window (all levels from level 0)",
        "dune_atlas:threshold_independent": True,
    }
    st = write_native_pyramid(out, VAR, ai, x0=X0, y0=Y0, dx=DX, dy=DY, factors=factors, var_attrs=var_attrs(),
                              root_attrs=root_attrs, zarr_layer_hint={"clim": CLIM, "colormap": COLORMAP},
                              keepbits=keepbits, chunk=chunk, shard_chunks=shard_chunks)
    if keepbits is not None and keepbits < 23:
        from .fields import bitround
        fin = np.isfinite(ai) & (ai > 0)
        r = bitround(ai, keepbits)
        rel = np.abs(r[fin].astype("f8") - ai[fin]) / ai[fin]
        st["keepbits_max_rel_err"] = float(rel.max())
        st["keepbits_max_abs_err"] = float(np.nanmax(np.abs(r.astype("f8") - ai)))
        st["keepbits_zero_preserved"] = bool((r[ai == 0] == 0).all())
    st.update(read_s=round(t_read, 1), decode_counts=counts)
    return st


UNEP_LIMITS = (0.03, 0.2, 0.5, 0.65)


def registry_layer() -> dict:
    a = ATTRIBUTION
    return {
        "id": VAR, "title": TITLE, "titleTex": r"Aridity index $\mathrm{AI}$", "group": "climate",
        "type": "zarr-field", "source": "dune-atlas/v1/fields/aridity.zarr", "variable": VAR,
        "thresholdAware": False, "units": "dimensionless",
        "description": ("Global Aridity Index v3.1 (1970–2000): mean annual precipitation divided by reference "
                        "evapotranspiration, native 30″ (~1 km) grid. UNEP classes: < 0.03 hyper-arid, 0.03–0.2 "
                        "arid, 0.2–0.5 semi-arid, 0.5–0.65 dry sub-humid, > 0.65 humid. Values of 6.5535 mean "
                        "AI ≥ 6.5535 (source saturation). Ocean, Antarctica (south of 60° S) and polar ice with "
                        "zero ET0 have no data."),
        "citation": f"{a['citation']}; data: Zomer & Trabucco, Global-AI_PET v3.1, doi:{a['doi']} ({a['licence']})",
        "attribution": dict(a),
        "visible": False, "opacity": 0.85, "queryable": False,
        "display": {"transform": "none", "colormap": COLORMAP, "clim": CLIM, "log": True,
                    # UNEP aridity class limits as legend ticks; top of the scale is saturated in the source
                    # (no legendNote: the classes, saturation and no-data areas are stated once, in the info)
                    "ticks": list(UNEP_LIMITS), "topLabel": "≥ 6.5"},
    }


def main(argv=None):
    import argparse
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.aridity")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("pyramid", help="native-resolution GeoZarr pyramid (fields/aridity.zarr)")
    b.add_argument("--data", default=os.environ.get("DUNE_WORLD_DATA", ""))
    b.add_argument("--out", required=True)
    b.add_argument("--keepbits", type=int, default=12)
    c = sub.add_parser("cellmeans", help="per-cell AI mean / valid fraction on a wind grid -> .npz")
    c.add_argument("--data", default=b.get_default("data"))
    c.add_argument("--out", required=True)
    c.add_argument("--grid", default="era5-land", choices=["era5-land", "era5"])
    a = p.parse_args(argv)
    if a.cmd == "pyramid":
        print(json.dumps(build_pyramid(a.data, a.out, keepbits=a.keepbits)))
    else:
        ai, sat, counts = load(a.data)
        g = dict(dlat=0.1, dlon=0.1, ny=1801, nx=3600) if a.grid == "era5-land" else dict(dlat=0.25, dlon=0.25, ny=721, nx=1440)
        r = wind_grid_means(ai, sat, **g)
        np.savez_compressed(a.out, **r, grid=json.dumps({"lat0": 90.0, "lon0": -180.0, **g}))
        print(json.dumps({k: int(np.isfinite(v).sum()) for k, v in r.items()}))


if __name__ == "__main__":
    main()
