"""EMARS source transform (mars/sources/emars.py) on small synthetic arrays, no network: the D-grid geometry check,
destaggering onto the 34 kept mass rows with the longitude roll, and the chronological selection of one Mars year
from an interleaved time axis."""
import numpy as np
import pytest
from dune_atlas_pipeline.mars import datasets as D
from dune_atlas_pipeline.mars.sources import emars as E

GRID = D.get("emars-v1-my30").grid
DLAT = 180 / 35


def _coords():
    """EMARS coordinate arrays as stored by ARCO-EMARS (float64 for lat/latu with the float32-like padding row)."""
    latu = np.r_[-90 + DLAT / 2 - 1e-5, -90 + DLAT / 2 + DLAT * np.arange(35)]
    lat = np.r_[-90 + DLAT / 4, 0.5 * (latu[1:35] + latu[2:]), 90 - DLAT / 4]
    return lat, latu, 3.0 + 6 * np.arange(60), 6.0 * np.arange(60)


def test_geometry_of_the_source_coordinates():
    lat, latu, lon, lonv = _coords()
    g = E.check_geometry(lat, latu, lon, lonv, GRID)
    assert np.isclose(g["kept_lat"][0], 84.857142857) and np.isclose(g["dropped_lat"][1], 88.714285714)
    assert np.isclose(g["lat_interfaces"][0], -87.428571428)
    with pytest.raises(AssertionError):                       # V columns on the mass longitudes: not a D-grid
        E.check_geometry(lat, latu, lon, lon, GRID)
    with pytest.raises(AssertionError):                       # no padding row: interfaces shifted by one
        E.check_geometry(lat, np.r_[latu[1:], 90.0], lon, lonv, GRID)


def test_destagger_rows_columns_and_roll():
    lat, latu, lon, lonv = _coords()
    nt = 3
    t = np.arange(nt)[:, None, None]
    # linear in the staggered coordinate: the two-point mean is exact at the mass point between them
    u = (2.0 * latu[None, :, None] + 0 * lon[None, None, :] + t).astype("f4")
    u[:, 0] = 0.0                                             # padding row
    v = np.broadcast_to(lonv[None, None, :] + 0 * lat[None, :, None] - t, (nt, 36, 60)).astype("f4").copy()
    T = (200 + lat[None, :, None] + lon[None, None, :] / 100 + t).astype("f4")
    ps = (600 + 0 * T + lon[None, None, :]).astype("f4")
    c = E.destagger(u, v, T, ps)
    glat, glon = D.grid_axes(GRID)
    assert c["u"].shape == (34, 60, nt) and c["u"].dtype == np.float32
    np.testing.assert_allclose(c["u"], 2 * glat[:, None, None] + t.reshape(1, 1, nt) + 0 * glon[None, :, None],
                               atol=1e-4)
    # V at mass column lon_i is the mean of lonv[i] and lonv[i+1]: = lon_i except at 357 (354 and 0 -> 177)
    src_lon = (glon + 360) % 360
    exp_v = np.where(src_lon == 357, 177.0, src_lon)[None, :, None] - t.reshape(1, 1, nt)
    np.testing.assert_allclose(c["v"], np.broadcast_to(exp_v, c["v"].shape), atol=1e-4)
    np.testing.assert_allclose(c["T"][:, :, 0], 200 + glat[:, None] + src_lon[None, :] / 100, atol=1e-3)
    assert c["ps"][0, 0, 0] == 600 + 183 and c["ps"][0, 30, 0] == 600 + 3      # column 0 = lon -177 = 183 E
    # a single impulse in U at interface latu[j] reaches exactly the two mass rows it bounds
    u1 = np.zeros((1, 36, 60), "f4"); u1[0, 20, 7] = 2.0
    z = np.zeros((1, 36, 60), "f4")
    cu = E.destagger(u1, z, z, z)["u"][:, :, 0]
    rows, cols = np.nonzero(cu)
    assert sorted(glat[rows]) == pytest.approx(sorted([lat[19], lat[20]])) and set(cols) == {(7 + 30) % 60}
    assert np.allclose(cu[rows, cols], 1.0)
    # the padding row and the polar rows never reach the contract grid
    u2 = np.zeros((1, 36, 60), "f4"); u2[0, 0] = 99.0
    t2 = np.zeros((1, 36, 60), "f4"); t2[0, [0, 35]] = 99.0
    assert not E.destagger(u2, z, t2, t2)["u"].any() and not E.destagger(z, z, t2, t2)["T"].any()


def test_select_year_from_interleaved_axis():
    # two files interleaved step by step around a year boundary, as in the ARCO-EMARS store
    t = 100 + np.arange(96) / 24                              # 4 sols, hourly
    sol, hour = np.floor(t), np.round((t % 1) * 24)
    ls = np.linspace(357, 361, 96) % 360                      # Ls = 0 at step 72, inside the second file
    my = np.where(np.linspace(357, 361, 96) >= 360, 31.0, 30.0)
    order = np.ravel(np.column_stack([np.arange(0, 48), np.arange(48, 96)]))
    s = E.select_year(my[order], ls[order], sol[order], hour[order], 30)
    assert s["n"] == int((my == 30).sum()) and not s["chronological_in_store"]
    np.testing.assert_array_equal(order[s["index"]], np.flatnonzero(my == 30))
    assert np.allclose(np.diff(s["t"]), 1 / 24)
    with pytest.raises(AssertionError):                       # a missing hour is a gap
        keep = np.r_[0:10, 11:96]
        E.select_year(my[keep], ls[keep], sol[keep], hour[keep], 30)
    with pytest.raises(AssertionError):                       # a duplicated hour
        keep = np.r_[0:10, 9:96]
        E.select_year(my[keep], ls[keep], sol[keep], hour[keep], 30)
