"""Synthetic Mars inputs for the App-track development fixture (numpy only; shared by make_fixture.py and
make_fixture_tiles.py). NOT science data: smooth analytic topography and hourly series with realistic
magnitudes (lowest-level winds 0-25 m/s, T 145-300 K, rho 0.005-0.03 kg m^-3, a CO2 seasonal pressure
cycle, diurnal tides, slope winds and red noise), deterministic per cell.

Grid = the data contract: rows lat 89 -> -89 (lat0 89, dlat -2), columns lon -179 -> 179 (lon0 -179,
dlon 2), cell centres, 90 x 180.
"""
import numpy as np

NY, NX = 90, 180
LAT0, DLAT, LON0, DLON = 89.0, -2.0, -179.0, 2.0
GRID_ATTRS = {"lat0": 89, "dlat": -2, "lon0": -179, "dlon": 2, "ny": 90, "nx": 180, "cell_registration": "centre"}
N_HOURS = 16032
R_AIR = 191.8   # pipeline mars/constants.py (only used to build rho and z from p and T here)
G = 3.71
# lowest-layer interfaces of the FV3 output (cells.zarr attrs air_state_interfaces of the Wind build)
AK_LO, BK_LO, AK_HI, BK_HI = 0.0, 1.0, 0.0012951873941347003, 0.9995690584182739


def lat_of(iy):
    return LAT0 + DLAT * np.asarray(iy)


def lon_of(ix):
    return LON0 + DLON * np.asarray(ix)


def _bump(lat, lon, lat0, lon0, sig_lat, sig_lon, amp):
    dlon = (np.asarray(lon) - lon0 + 180.0) % 360.0 - 180.0
    return amp * np.exp(-0.5 * (((np.asarray(lat) - lat0) / sig_lat) ** 2 + (dlon / sig_lon) ** 2))


def elevation(lat, lon):
    """Synthetic elevation (m): northern lowlands / southern highlands dichotomy, Tharsis and its volcanoes,
    Elysium, Hellas and Argyre, plus gentle roughness. Broadcasts over lat/lon (deg)."""
    lat = np.asarray(lat, dtype="f8"); lon = np.asarray(lon, dtype="f8")
    z = -2000.0 - 2800.0 * np.tanh((lat - 5.0 - 12.0 * np.sin(np.radians(lon + 30.0))) / 14.0)
    z = z + _bump(lat, lon, 0.0, -105.0, 22.0, 30.0, 6500.0)          # Tharsis rise
    for la, lo, a in ((18.4, -134.0, 15000.0), (-0.8, -112.6, 10000.0), (1.5, -104.4, 9000.0), (-8.3, -120.8, 9500.0)):
        z = z + _bump(lat, lon, la, lo, 2.5, 2.8, a)                   # Olympus, Pavonis, Ascraeus, Arsia
    z = z + _bump(lat, lon, 25.0, 147.0, 6.0, 7.0, 4500.0)             # Elysium
    z = z + _bump(lat, lon, -42.4, 70.5, 9.0, 12.0, -6500.0)           # Hellas
    z = z + _bump(lat, lon, -49.7, -43.4, 6.0, 8.0, -3500.0)           # Argyre
    z = z + 250.0 * np.sin(np.radians(7 * lon)) * np.cos(np.radians(5 * lat))
    return z


def _slope(lat, lon, h=0.5):
    """dz/dx, dz/dy (m per m) by central differences of `elevation` (R = 3389.5 km)."""
    R = 3389.5e3
    zx = (elevation(lat, lon + h) - elevation(lat, lon - h)) / (np.radians(2 * h) * R * max(np.cos(np.radians(lat)), 0.05))
    zy = (elevation(lat + h, lon) - elevation(lat - h, lon)) / (np.radians(2 * h) * R)
    return float(zx), float(zy)


def _ar1(rng, n, tau_h, sigma):
    """Red noise with e-folding time tau_h hours and stationary std sigma."""
    from scipy.signal import lfilter
    a = np.exp(-1.0 / tau_h)
    e = rng.standard_normal(n) * sigma * np.sqrt(1 - a * a)
    x0 = rng.standard_normal() * sigma
    return lfilter([1.0], [1.0, -a], e, zi=[a * x0])[0]


def synth_series(iy, ix, n_hours=N_HOURS):
    """Hourly (u, v, T, rho, z, ls, sol) float64 arrays of one cell (deterministic); rho and z from the lowest-layer
    mid pressure (pipeline air_state / layer_height formulas): z ~ 1.6-3.3 m."""
    lat, lon = float(lat_of(iy)), float(lon_of(ix))
    rng = np.random.default_rng(1_000_003 * int(iy) + int(ix) + 7)
    t = np.arange(n_hours, dtype="f8")
    sol = t / 24.0
    lsr = 2 * np.pi * t / n_hours
    ls = np.degrees(lsr + 0.0934 * np.sin(lsr - np.radians(250.0))) % 360.0   # mild eccentricity
    lt = (t % 24 + lon / 15.0) % 24
    z = float(elevation(lat, lon))
    ps = 610.0 * np.exp(-z / 11100.0) * (1 + 0.12 * np.sin(lsr - 0.8) - 0.05 * np.cos(2 * lsr))
    dec = np.radians(25.2) * np.sin(np.radians(ls))
    cz = np.cos(np.radians(lat) - dec)
    tbar = 150.0 + 70.0 * np.clip(cz, 0, 1) ** 0.6 - 4.0 * z / 10000.0
    amp = 32.0 * np.clip(cz, 0.05, 1) ** 0.5
    T = np.maximum(tbar + amp * np.cos(2 * np.pi * (lt - 14.5) / 24.0), 145.0) + _ar1(rng, n_hours, 48, 2.5)
    T = np.maximum(T, 143.0)
    p_lo = AK_LO + BK_LO * ps
    p_mid = 0.5 * (p_lo + (AK_HI + BK_HI * ps))
    rho = p_mid / (R_AIR * T)
    zl = R_AIR * T / G * np.log(p_lo / p_mid)
    phi = np.radians(lat)
    u0 = 7.0 * np.sin(2 * phi) + 6.0 * np.cos(lsr) * np.sin(phi) + 3.0 * np.cos(3 * phi)
    v0 = -2.5 * np.sin(phi) * np.cos(lsr)
    ta = 2.5 + 2.5 * np.cos(phi)
    ut = ta * np.cos(2 * np.pi * (lt - 10.0) / 24.0)
    vt = ta * np.sin(2 * np.pi * (lt - 10.0) / 24.0) * np.sign(lat if lat != 0 else 1.0)
    zx, zy = _slope(lat, lon)
    g = np.hypot(zx, zy) + 1e-9
    k = np.clip(g * 2500.0, 0, 9.0) + (6.0 if abs(lat) > 72 else 0.0)        # slope / katabatic strength
    night = np.cos(2 * np.pi * (lt - 3.0) / 24.0)                               # + at night: downslope
    us = -k * night * zx / g
    vs = -k * night * zy / g
    if lat > 72:     # katabatic outflow from the north polar cap
        vs = vs - 4.0 * np.clip(night, 0, None)
    u = u0 + ut + us + _ar1(rng, n_hours, 30, 3.5)
    v = v0 + vt + vs + _ar1(rng, n_hours, 30, 3.0)
    return {"u": u, "v": v, "T": T, "rho": rho, "z": zl, "ls": ls, "sol": sol}
