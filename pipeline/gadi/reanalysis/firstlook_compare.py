# First-look comparison of MERRA-2 (1980-2025) and JRA-3Q (1980-2025) with ERA5 (1950-2024), 10 m winds.
# Inputs: the .npz exports of check_stores.py / export_era5.py (native grids). Every field is averaged to 1° boxes
# (mean of the cell centres in the box; RDD from the vector mean of the RDP vectors), compared on land boxes
# (ERA5 land-sea mask mean >= 0.5, 60° S to 75° N).
import glob
import numpy as np

S2Y = 365.25 * 86400.0
BOX = 1.0


def load(name):
    d = np.load(glob.glob(f"hpc/*/firstlook/{name}.npz")[0])
    out = {k: d[k] for k in d.files}
    lon = ((out["lon"] + 180.0) % 360.0) - 180.0
    out["lon"] = lon
    return out


def to_boxes(d, keys):
    """box means on the 1° grid (180 x 360, rows south to north, columns from -180)."""
    lat, lon = d["lat"], d["lon"]
    iy = np.clip(np.floor((lat + 90.0) / BOX).astype(int), 0, int(180 / BOX) - 1)
    ix = np.clip(np.floor((lon + 180.0) / BOX).astype(int), 0, int(360 / BOX) - 1)
    IY, IX = np.meshgrid(iy, ix, indexing="ij")
    flat = (IY * int(360 / BOX) + IX).ravel()
    n = int(180 / BOX) * int(360 / BOX)
    out = {}
    for k in keys:
        v = np.asarray(d[k], dtype=np.float64).ravel()
        ok = np.isfinite(v)
        s = np.bincount(flat[ok], v[ok], n)
        c = np.bincount(flat[ok], None, n)
        out[k] = np.where(c > 0, s / np.where(c > 0, c, 1), np.nan).reshape(int(180 / BOX), int(360 / BOX))
    return out


def boxed(name, land_frac=None):
    d = load(name)
    d["dp"] = d["dpm"] * S2Y
    d["rdp"] = d["rdpm"] * S2Y
    d["rx"] = d["rdp"] * np.cos(d["rdpa"])
    d["ry"] = d["rdp"] * np.sin(d["rdpa"])
    keys = ["mean_speed", "dp", "rx", "ry"] + (["lsm"] if "lsm" in d else [])
    b = to_boxes(d, keys)
    b["rdp"] = np.hypot(b["rx"], b["ry"])
    b["rdd"] = np.arctan2(b["ry"], b["rx"])
    b["dir"] = np.where(b["dp"] > 0, b["rdp"] / np.where(b["dp"] > 0, b["dp"], 1), np.nan)
    return b, d
