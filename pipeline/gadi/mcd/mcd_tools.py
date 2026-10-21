"""Helpers of the MCD 6.1 extraction on Gadi (mcd_series.F90): sample times, chunk files, the self-test against the
MCD netCDF files and a reader of the binary chunks.

    python mcd_tools.py times <outdir> <nchunks>      # times_XX.txt for the full year (8023 samples)
    python mcd_tools.py testtimes <outdir>            # test_times.txt: Ls 15 + 30 m, every stored time of day
    python mcd_tools.py check <test.bin> <mcd_data_dir>   # compare the test output with clim_MM_me.nc level 1
    python mcd_tools.py lowest <mcd_data_dir>         # print aps1 bps1 of the lowest model level

Time axis: sample k (0 .. 8022) is at s_k = (k + 1)/12 sols after Ls 0 (MCD's sol2ls, 668.6-sol year); its
prime-meridian true solar time is 24 frac(s_k) h (2, 4, ..., 22, 0), the stored times of day of the MCD files.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

N_SAMPLES = 8023            # floor(668.6 * 12): whole two-hour samples inside one MCD year
SAMPLES_PER_SOL = 12
NLAT, NLON, NVAR = 47, 64, 9
LAT0, DLAT, LON0, DLON = 86.25, -3.75, -180.0, 5.625
VARS = ("u", "v", "T", "p", "rho", "z", "ps", "tsurf", "ps_gcm")


def sample_times() -> np.ndarray:
    """(sol, ut) of every sample; ut in hours at the prime meridian."""
    k = np.arange(N_SAMPLES, dtype="f8")
    sol = (k + 1.0) / SAMPLES_PER_SOL
    ut = 24.0 * (((k + 1.0) % SAMPLES_PER_SOL) / SAMPLES_PER_SOL)
    return np.stack([sol, ut], axis=1)


def write_times(outdir: str, nchunks: int) -> list[str]:
    st = sample_times()
    out = Path(outdir); out.mkdir(parents=True, exist_ok=True)
    names = []
    for c, idx in enumerate(np.array_split(np.arange(N_SAMPLES), nchunks)):
        name = f"times_{c:02d}.txt"
        with open(out / name, "w") as f:
            for k in idx:
                f.write(f"{float(st[k, 0])!r} -1.0 {float(st[k, 1])!r}\n")
        names.append(name)
    return names


def write_test_times(outdir: str) -> str:
    p = Path(outdir) / "test_times.txt"
    with open(p, "w") as f:
        for m in range(12):
            for h in range(2, 25, 2):
                f.write(f"0.0 {15.0 + 30.0 * m!r} {float(h)!r}\n")
    return str(p)


def read_chunk(path: str) -> dict:
    """Binary chunk -> dict of (nt, 47, 64) float32 arrays (rows north to south) plus ls, ut (nt,)."""
    rec = 2 + NVAR * NLAT * NLON
    a = np.fromfile(path, dtype="<f4")
    assert a.size % rec == 0, (path, a.size, rec)
    a = a.reshape(-1, rec)
    out = {"ls": a[:, 0].copy(), "ut": a[:, 1].copy()}
    f = a[:, 2:].reshape(-1, NVAR, NLAT, NLON)          # Fortran (64, 47) per field -> C (47, 64)
    for i, k in enumerate(VARS):
        out[k] = np.ascontiguousarray(f[:, i])
    return out


def lowest(data_dir: str) -> tuple[float, float]:
    import netCDF4
    with netCDF4.Dataset(f"{data_dir}/clim_aveEUV/clim_01_me.nc") as d:
        return float(d["aps"][0]), float(d["bps"][0])


def check(test_bin: str, data_dir: str) -> None:
    """Test output (Ls 15 + 30 m, ut 2..24) against level 1 of clim_MM_me.nc at the same node and stored time."""
    import netCDF4
    t = read_chunk(test_bin)
    nt = t["u"].shape[0]
    assert nt == 144, nt
    print("ls_used", np.unique(np.round(t["ls"], 4))[:13])
    print("ut_used", np.round(t["ut"][:12], 4))
    for k in ("u", "v", "T", "ps", "ps_gcm", "z", "rho"):
        print(k, "nan", int(np.isnan(t[k]).sum()), "range", float(np.nanmin(t[k])), float(np.nanmax(t[k])))
    worst = {k: 0.0 for k in ("u", "v", "temp", "ps")}
    for m in range(12):
        with netCDF4.Dataset(f"{data_dir}/clim_aveEUV/clim_{m + 1:02d}_me.nc") as d:
            lat = np.asarray(d["latitude"][:]); lon = np.asarray(d["longitude"][:])
            rows = [int(np.argmin(np.abs(lat - (LAT0 + DLAT * j)))) for j in range(NLAT)]
            cols = [int(np.argmin(np.abs(lon - (LON0 + DLON * i)))) for i in range(NLON)]
            assert np.allclose(lat[rows], LAT0 + DLAT * np.arange(NLAT)) and np.allclose(lon[cols], LON0 + DLON * np.arange(NLON))
            times = np.asarray(d["Time"][:])
            for h in range(12):
                it = int(np.argmin(np.abs(times - 2.0 * (h + 1))))
                s = m * 12 + h
                for ours, theirs, lev in (("u", "u", 0), ("v", "v", 0), ("T", "temp", 0), ("ps", "ps", None)):
                    v = d[theirs]
                    ref = np.asarray(v[it, lev] if lev is not None else v[it])[np.ix_(rows, cols)]
                    diff = np.nanmax(np.abs(t[ours][s] - ref))
                    worst[theirs] = max(worst[theirs], float(diff))
    print("max |driver - file level 1| at month centres and stored times:", worst)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "times":
        print(" ".join(write_times(sys.argv[2], int(sys.argv[3]))))
    elif cmd == "testtimes":
        print(write_test_times(sys.argv[2]))
    elif cmd == "check":
        check(sys.argv[2], sys.argv[3])
    elif cmd == "lowest":
        a, b = lowest(sys.argv[2]); print(repr(a), repr(b))
    else:
        raise SystemExit(cmd)
