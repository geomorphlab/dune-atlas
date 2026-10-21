"""mars/sources/mcd.py (no MCD install needed): lowest-level interfaces, MCD's sol2ls, the chunk layout written by
gadi/mcd/mcd_series.F90, the time axis and the surface-temperature noon check."""
import numpy as np

from dune_atlas_pipeline.mars import constants as C
from dune_atlas_pipeline.mars import datasets as D
from dune_atlas_pipeline.mars import physics as P
from dune_atlas_pipeline.mars.sources import mcd as M


def test_interfaces_give_lowest_level_pressure_and_height():
    ps, T = np.array([150.0, 600.0, 1400.0]), np.array([150.0, 200.0, 270.0])
    ab = M.interfaces()
    p, rho = P.air_state(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"])
    np.testing.assert_allclose(p, M.APS1 + M.BPS1 * ps, rtol=1e-12)
    np.testing.assert_allclose(rho, p / (C.R_AIR * T), rtol=1e-12)
    z = P.layer_height(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"])
    np.testing.assert_allclose(z, C.R_AIR * T / C.G * np.log(ps / p), rtol=1e-12)
    assert np.all((z > 3.0) & (z < 7.0))          # about 4.5 m: the lowest MCD level


def test_sol2ls_matches_mcd_conventions():
    assert abs(M.sol2ls(np.array([0.0]))[0] - 0.0) < 0.05 or abs(M.sol2ls(np.array([0.0]))[0] - 360.0) < 0.05
    assert abs(M.sol2ls(np.array([485.35]))[0] - 250.99) < 1e-3          # perihelion (MCD.F90 timeperi)
    ls = M.sol2ls(np.linspace(1.0, 668.0, 2000))
    assert np.all(np.diff(ls) > 0)                                       # monotonic through one year


def test_sample_times():
    sol, ut = M.sample_times()
    assert sol.size == M.N_SAMPLES == D.get(M.DATASET_ID).n_samples
    np.testing.assert_allclose(sol[:3], [1 / 12, 2 / 12, 3 / 12])
    np.testing.assert_allclose(ut[:12], [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0])
    assert sol[-1] < 668.6


def test_read_chunk_layout(tmp_path):
    nt, rec = 3, 2 + M.NVAR * M.NLAT * M.NLON
    a = np.zeros((nt, rec), "<f4")
    for t in range(nt):
        a[t, :2] = (10.0 + t, 2.0 * (t + 1))
        for k in range(M.NVAR):
            f = np.arange(M.NLAT * M.NLON, dtype="f4").reshape(M.NLAT, M.NLON) + 1000 * k + 1e5 * t
            a[t, 2 + k * M.NLAT * M.NLON: 2 + (k + 1) * M.NLAT * M.NLON] = f.ravel()   # Fortran (64,47) = C (47,64)
    p = tmp_path / "chunk_00.bin"; a.tofile(p)
    c = M.read_chunk(str(p))
    assert c["u"].shape == (nt, M.NLAT, M.NLON)
    np.testing.assert_array_equal(c["ls"], [10, 11, 12])
    assert c["T"][1, 2, 5] == 2 * 1000 + 1e5 + 2 * M.NLON + 5           # row 2 (82.5N), column 5


def test_grid_is_native_nodes_without_poles():
    lat, lon = D.grid_axes(D.get(M.DATASET_ID).grid)
    np.testing.assert_allclose(lat, 86.25 - 3.75 * np.arange(47))
    np.testing.assert_allclose(lon, -180 + 5.625 * np.arange(64))


def test_noon_offset_on_synthetic_lobe():
    lat, lon = D.grid_axes(D.get(M.DATASET_ID).grid)
    ut = np.array([2.0, 14.0])
    peak = (12 - ut) * 15 + 20.0                                          # warm lobe 20 deg east of noon
    ts = 200 + 50 * np.cos(np.radians(lon[None, None, :] - peak[:, None, None])) * np.ones((1, lat.size, 1))
    off = M.noon_offset(ts, ut, lat, lon)
    np.testing.assert_allclose(off, 20.0, atol=0.5)
