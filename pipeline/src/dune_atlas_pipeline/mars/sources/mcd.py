"""Mars Climate Database 6.1, climatology scenario with average solar EUV: one MCD year of lowest-model-level series
as the contract source store of `mcd-v61-clim` (cells.read_contract), assembled from the binary chunks written on
Gadi by pipeline/gadi/mcd/mcd_series.F90 (full.pbs).

Source: the MCD 6.1 full distribution (Forget et al. 1999, doi:10.1029/1999JE001025; Millour et al. 2018),
call_mcd 6.1.2 built with gfortran -O0, scenario 1 (`clim_aveEUV`: 12 monthly means of the diurnal cycle, every
two hours of prime-meridian time, on the 64 x 49 native grid and 53 hybrid levels), mean state (perturkey = 1),
GCM-resolution fields (hireskey = 0).

  grid       the native MCD nodes without the two pole rows, used as cell centres: rows 86.25 -> -86.25 (3.75 deg),
             columns -180 -> 174.375 (5.625 deg); hireskey = 0, so at a node call_mcd returns the native-grid values
             (bilinear weights 0/1; checked against the files in gadi/mcd/test.pbs).
  level      the lowest model level, p1 = aps1 + bps1 ps (aps1 = 0.004555 Pa, bps1 = 0.99954; about 4.5 m above the
             surface), requested at p1 (1 - 1e-6) with zkey = 4 so that MCD interpolates between levels 1 and 2 with
             a weight of order 1e-3 instead of using its below-first-level surface-layer law. Contract interfaces:
             bottom (0, 1) and top (2 aps1, 2 bps1 - 1), so physics.air_state gives p = aps1 + bps1 ps and
             physics.layer_height z = (R T/g) ln(ps/p), as for MACDA.
  time       sample k = 0 .. 8022 at s_k = (k + 1)/12 sols after Ls 0 (MCD sol2ls, 668.6-sol year); prime-meridian
             true solar time 24 frac(s_k) h (2, 4, ..., 22, 0 = the stored times of day); call_mcd interpolates
             linearly between the monthly means (month centres at Ls 15 + 30 m). `ls` is MCD's Ls (extvar 9),
             `sol` is s_k.

    python -m dune_atlas_pipeline.mars.sources.mcd --chunks <dir with chunk_XX.bin> --out source/mcd-v61-clim.zarr \\
        --report mcd_extract.json
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from .. import datasets as D
from .. import physics as P

DATASET_ID = "mcd-v61-clim"
APS1, BPS1 = 0.004555349238216877, 0.9995445609092712      # clim_aveEUV/clim_01_me.nc aps[0], bps[0]
N_SAMPLES, SAMPLES_PER_SOL = 8023, 12
NLAT, NLON, NVAR = 47, 64, 9
VARS = ("u", "v", "T", "p", "rho", "z", "ps", "tsurf", "ps_gcm")


def interfaces(aps1: float = APS1, bps1: float = BPS1) -> dict:
    """Contract interfaces of the lowest layer whose mid pressure is aps1 + bps1 ps."""
    return {"ak_bottom": 0.0, "bk_bottom": 1.0, "ak_top": 2.0 * aps1, "bk_top": 2.0 * bps1 - 1.0}


def sample_times() -> tuple[np.ndarray, np.ndarray]:
    """sol (s_k) and prime-meridian time of day (h) of the samples (as gadi/mcd/mcd_tools.py)."""
    k = np.arange(N_SAMPLES, dtype="f8")
    return (k + 1.0) / SAMPLES_PER_SOL, 24.0 * (((k + 1.0) % SAMPLES_PER_SOL) / SAMPLES_PER_SOL)


def sol2ls(sol: np.ndarray) -> np.ndarray:
    """MCD 6.1 sol2ls (MCD.F90), vectorised in float64: Ls (deg) of sol, sol 0 = Ls 0, 668.6-sol year."""
    year, peri, e, timeperi = 668.6, 485.35, 0.09340, 1.90258341759902
    zz = (np.asarray(sol, "f8") - peri) / year
    zanom = 2.0 * np.pi * (zz - np.rint(zz))
    xref = np.abs(zanom)
    x = xref + e * np.sin(xref)
    for _ in range(12):
        x = x - (x - e * np.sin(x) - xref) / (1.0 - e * np.cos(x))
    x = np.where(zanom < 0, -x, x)
    teta = 2.0 * np.arctan(np.sqrt((1 + e) / (1 - e)) * np.tan(x / 2.0))
    ls = np.mod(teta - timeperi, 2.0 * np.pi)
    return np.degrees(ls)


def read_chunk(path: str) -> dict:
    """One chunk of mcd_series: dict of (nt, 47, 64) float32 fields (rows north to south) plus ls, ut (nt,)."""
    rec = 2 + NVAR * NLAT * NLON
    a = np.fromfile(path, dtype="<f4")
    assert a.size % rec == 0, (path, a.size, rec)
    a = a.reshape(-1, rec)
    out = {"ls": a[:, 0].astype("f8"), "ut": a[:, 1].astype("f8")}
    f = a[:, 2:].reshape(-1, NVAR, NLAT, NLON)
    for i, k in enumerate(VARS):
        out[k] = f[:, i]
    return out


def noon_offset(tsurf: np.ndarray, ut: np.ndarray, lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Longitude of the surface-temperature maximum along the two rows next to the equator (warmth-weighted circular
    mean of T - min) minus the longitude where the true solar time is noon, (12 - ut) 15 (deg, wrapped to +-180).
    Positive: the warm lobe lies east of the noon meridian, i.e. in the early afternoon (thermal inertia)."""
    rows = np.argsort(np.abs(np.asarray(lat, "f8")))[:2]
    eq = tsurf[:, rows].mean(axis=1).astype("f8")
    w = eq - eq.min(axis=1, keepdims=True)
    obs = np.degrees(np.angle((w * np.exp(1j * np.radians(np.asarray(lon, "f8")))[None]).sum(axis=1)))
    pred = 15.0 * (12.0 - np.asarray(ut, "f8"))
    return (obs - pred + 180.0) % 360.0 - 180.0


def assemble(chunks_dir: str, out: str, log=print) -> dict:
    """Write the contract source store from chunk_00.bin ... and return the assembly report."""
    import zarr
    ds = D.get(DATASET_ID)
    t0 = time.time()
    files = sorted(Path(chunks_dir).glob("chunk_*.bin"))
    assert files, chunks_dir
    for f in files:
        meta = Path(str(f) + ".meta").read_text()
        assert meta.rstrip().endswith("done") and "ier_other     0" in meta, f
    parts = [read_chunk(str(f)) for f in files]
    cat = {k: np.concatenate([p[k] for p in parts]) for k in ("ls", "ut", *VARS)}
    nt = cat["u"].shape[0]
    assert nt == N_SAMPLES == ds.n_samples, (nt, ds.n_samples)
    sol, ut = sample_times()
    lat, lon = D.grid_axes(ds.grid)
    rep = {"dataset": ds.id, "n": nt, "chunks": len(files)}
    # time checks: MCD's own Ls and prime-meridian time against the requested ones
    rep["ls_minus_sol2ls_max_abs_deg"] = float(np.abs((cat["ls"] - sol2ls(sol) + 180) % 360 - 180).max())
    rep["ut_minus_requested_max_abs_h"] = float(np.abs((cat["ut"] - ut + 12) % 24 - 12).max())
    assert rep["ls_minus_sol2ls_max_abs_deg"] < 1e-3 and rep["ut_minus_requested_max_abs_h"] < 1e-3, rep
    for k in VARS:
        assert np.isfinite(cat[k]).all(), (k, int((~np.isfinite(cat[k])).sum()))
    assert np.array_equal(cat["ps"], cat["ps_gcm"]), "hireskey=0: ps must be ps_gcm"
    # the air state the atlas computes from (T, ps) against MCD's own p, rho and height
    ab = interfaces()
    ps, T = cat["ps"].astype("f8"), cat["T"].astype("f8")
    p, rho = P.air_state(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"])
    z = P.layer_height(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"])
    rel = lambda a, b: float(np.abs(a / b - 1).max())
    rep["atlas_vs_mcd"] = {"p_rel_max": rel(p, cat["p"]), "rho_rel_max": rel(rho, cat["rho"]),
                           "rho_rel_median": float(np.median(np.abs(rho / cat["rho"] - 1))),
                           "z_rel_max": rel(z, cat["z"]), "z_rel_median": float(np.median(np.abs(z / cat["z"] - 1)))}
    off = noon_offset(cat["tsurf"], ut, lat, lon)
    rep["tsurf_peak_minus_noon_deg"] = {"mean": float(off.mean()), "sd": float(off.std()),
                                       "min": float(off.min()), "max": float(off.max())}
    U = np.hypot(cat["u"], cat["v"])
    rep["ranges"] = {k: [float(cat[k].min()), float(cat[k].max())] for k in ("u", "v", "T", "ps", "rho", "z", "tsurf")}
    rep["speed_p50_p99_max"] = [float(np.percentile(U, 50)), float(np.percentile(U, 99)), float(U.max())]
    g = zarr.open_group(out, mode="w", zarr_format=3)
    g.attrs.update({
        "dataset": ds.id, "grid": ds.grid, "interfaces": ab,
        "source": ("Mars Climate Database 6.1 (call_mcd 6.1.2), scenario 1 = climatology with average solar EUV "
                   "(clim_aveEUV), mean state (perturkey 1), hireskey 0, lowest model level"),
        "variables": {"u": "zonwind", "v": "merwind", "T": "temp", "ps": "extvar(15) = extvar(16) (GCM surface pressure)"},
        "level": {"aps1_Pa": APS1, "bps1": BPS1, "requested_pressure": "(aps1 + bps1 ps) (1 - 1e-6), zkey 4"},
        "time_of_day": "sol = s_k = (k + 1)/12 sols after Ls 0 (MCD sol2ls); prime-meridian true solar time 24 frac(sol) h",
    })
    tc = 2048
    for k in ("u", "v", "T", "ps"):
        g.create_array(k, data=np.ascontiguousarray(np.moveaxis(cat[k], 0, -1), "f4"), chunks=(ds.ny, ds.nx, tc))
    g.create_array("ls", data=cat["ls"].astype("f4"))
    g.create_array("sol", data=sol.astype("f4"))
    rep["seconds"] = round(time.time() - t0)
    return rep


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.sources.mcd")
    p.add_argument("--chunks", required=True, help="folder with chunk_XX.bin and .meta from gadi/mcd/full.pbs")
    p.add_argument("--out", required=True, help="contract source store to write (zarr v3)")
    p.add_argument("--report", default="")
    a = p.parse_args(argv)
    rep = assemble(a.chunks, a.out)
    if a.report:
        Path(a.report).write_text(json.dumps(rep, indent=1))
    print(json.dumps(rep))


if __name__ == "__main__":
    main()
