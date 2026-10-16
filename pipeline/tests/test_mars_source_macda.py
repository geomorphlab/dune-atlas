"""MACDA v2.0 extraction (mars/sources/macda.py), the pure parts on small synthetic arrays (no network): lowest
sigma level and its contract interfaces, the Mars-year selection of a store that is not in time order, the grid
transform to contract orientation, and the time-of-day check from the shortwave flux."""
import numpy as np
import pytest

from dune_atlas_pipeline.mars import constants as M
from dune_atlas_pipeline.mars import datasets as D
from dune_atlas_pipeline.mars import physics as P
from dune_atlas_pipeline.mars.sources import macda as MA

GRID = D.get("macda-v2-my30").grid


def _axes():
    lat = 87.5 - 5.0 * np.arange(36)                 # MACDA lat (float32 in the store: 87.49999 ...)
    lon = -180.0 + 5.0 * np.arange(72)
    return lat.astype("f4"), lon.astype("f4")


def test_lowest_level_and_interfaces():
    lev = np.array([0.9995, 0.99817, 0.99598, 0.5, 1e-5], "f4")
    k, s = MA.lowest_level(lev)
    assert k == 0 and s == pytest.approx(0.9995, abs=1e-7)
    ab = MA.interfaces(s)
    ps, T = np.array([600.0, 900.0]), np.array([180.0, 250.0])
    p, rho = P.air_state(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"])
    np.testing.assert_allclose(p, s * ps, rtol=1e-12)
    np.testing.assert_allclose(rho, s * ps / (M.R_AIR * T), rtol=1e-12)
    z = P.layer_height(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"])
    np.testing.assert_allclose(z, M.R_AIR * T / M.G * np.log(1 / s), rtol=1e-9)
    assert 4.5 < z[0] < 5.0                           # ~4.7 m at 180 K
    with pytest.raises(AssertionError):
        MA.lowest_level(np.array([0.5, 0.9995]))      # levels must descend from the surface


def test_select_year_reorders_blocks():
    spd, n = 12, 3                                    # three 2-sol blocks, the middle one stored last
    t = (np.arange(n * 2 * spd) + 1) / spd
    blocks = t.reshape(n, -1)
    stored = np.concatenate([blocks[0], blocks[2], blocks[1]])
    my = np.where(stored > 1.5, 30, 29)
    idx, rep = MA.select_year(stored, my, 30, spd)
    np.testing.assert_allclose(stored[idx], t[t > 1.5])
    assert rep["n"] == (t > 1.5).sum() and not rep["in_store_order"]
    assert rep["duplicates"] == rep["gaps"] == rep["uneven"] == 0
    with pytest.raises(AssertionError):               # a missing step
        MA.select_year(np.delete(stored, 30), np.delete(my, 30), 30, spd)
    with pytest.raises(AssertionError):               # a duplicated step
        MA.select_year(np.append(stored, stored[-1]), np.append(my, 30), 30, spd)


def test_to_contract_native_orientation():
    lat, lon = _axes()
    rng = np.random.default_rng(1)
    a = rng.normal(size=(5, 36, 72)).astype("f4")
    c = MA.to_contract(a, lat, lon, GRID)
    assert c.shape == (36, 72, 5) and c.dtype == np.float32 and c.flags.c_contiguous
    np.testing.assert_array_equal(c, np.moveaxis(a, 0, -1))   # no reordering on the native grid
    assert c[0, 0, 2] == a[2, 0, 0] and c[35, 71, 4] == a[4, 35, 71]


def test_to_contract_flips_and_rolls():
    lat, lon = _axes()
    a = np.arange(2 * 36 * 72, dtype="f4").reshape(2, 36, 72)
    lon360 = (lon + 360.0) % 360.0                    # 0 .. 355
    order = np.argsort(lon360)
    src = a[:, ::-1][:, :, order]                     # rows south -> north, columns 0 .. 355
    c = MA.to_contract(src, lat[::-1], lon360[order], GRID)
    np.testing.assert_array_equal(c, np.moveaxis(a, 0, -1))
    with pytest.raises(AssertionError):               # centres off the grid (a shifted grid is not regridded)
        MA.to_contract(a, lat, lon + 2.5, GRID)


def test_subsolar_offset_prime_meridian_time():
    lat, lon = _axes()
    t = 4011.0 + np.arange(1, 13) / 12.0              # one sol of two-hourly samples
    lt = 24.0 * (t[:, None] % 1.0) + lon[None, :].astype("f8") / 15.0   # local mean solar time (h)
    cosz = np.cos(np.radians(15.0 * (lt - 12.0)))
    sw = np.repeat(np.clip(cosz, 0, None)[:, None, :], 36, axis=1) * 500.0
    off = MA.subsolar_offset(sw, t, lat, lon)
    assert np.abs(off).max() < 1e-6
    off_lt = MA.subsolar_offset(np.roll(sw, 6, axis=2), t, lat, lon)   # fields 30 deg west of the clock
    np.testing.assert_allclose(off_lt, 30.0, atol=1e-6)
