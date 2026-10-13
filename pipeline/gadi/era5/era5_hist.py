"""Hourly 10 m wind histograms on the ERA5 0.25 deg grid, 1950-01-01T00 to 2024-12-31T23.

For every grid cell, counts of hours per (speed, direction) bin:
  um = (u10**2 + v10**2)**0.5, 128 bins on linspace(0, 20, 129) m/s
  ua = arctan2(v10, u10), 128 bins on linspace(-pi, pi, 129) (direction the wind blows toward, CCW from east)
with the numpy.histogram / xhistogram edge convention (bins closed on the left, the last bin also closed on
the right); hours with um > 20 m/s are not counted. The bins and the reduction match the ERA5-Land histogram
store (era5-land_1950_2024_uam10_hist.zarr). Packed int16 values are unpacked in float64 as
raw * scale_factor + add_offset (per file), as netCDF4/xarray do.

The grid is processed in latitude bands of 91 rows (the netCDF chunk height), so each band reads only
its own chunks. A band keeps its histogram in memory (uint32), checkpoints it every few years, and writes
its rows of the output store when complete.

  python era5_hist.py init  OUT.zarr
  python era5_hist.py band  OUT.zarr WORKDIR BAND [NREAD]      (resumable; WORKDIR/band_BB/{status.json,progress.jsonl})
  python era5_hist.py pilot WORKDIR BAND YEAR [NREAD]          (timing only, nothing written to OUT)
  python era5_hist.py hours WORKDIR                            (hour counts per year from every file's time axis)
  python era5_hist.py selftest                                 (kernel vs xhistogram / numpy.histogram2d)
"""
import concurrent.futures as cf
import json
import multiprocessing as mp
import os
import shutil
import sys
import time

import numpy as np
import numba
import netCDF4

ROOT = '/g/data/rt52/era5/single-levels/reanalysis'
Y0, Y1 = 1950, 2024
NLAT, NLON, BAND = 721, 1440, 91
NB = 128
UM_EDGES = np.linspace(0, 20, NB + 1)
UA_EDGES = np.linspace(-np.pi, np.pi, NB + 1)
FILL = -32767
CKPT_YEARS = 10
LAT_CHUNK, LON_CHUNK = 13, 64            # output chunks: 7 latitude chunks per band


def n_hours(y0=Y0, y1=Y1):
    return int((np.datetime64(f'{y1 + 1}-01-01T00') - np.datetime64(f'{y0}-01-01T00')) / np.timedelta64(1, 'h'))


def band_rows(b):
    return b * BAND, min((b + 1) * BAND, NLAT)


def files(var, year):
    d = f'{ROOT}/{var}/{year}'
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith('.nc'))


def months(y0=Y0, y1=Y1):
    out = []
    for y in range(y0, y1 + 1):
        fu, fv = files('10u', y), files('10v', y)
        assert len(fu) == 12 and len(fv) == 12, (y, len(fu), len(fv))
        for a, b in zip(fu, fv):
            assert os.path.basename(a)[3:] == os.path.basename(b)[3:], (a, b)
            out.append((y, a, b))
    return out


def read_band(path, var, r0, r1):
    """Raw int16 rows [r0, r1) for all hours, the packing, and the hourly time axis."""
    t0 = time.time()
    with netCDF4.Dataset(path) as d:
        x = d[var]
        x.set_auto_maskandscale(False)
        raw = np.ascontiguousarray(x[:, r0:r1, :])
        sc, off = float(x.scale_factor), float(x.add_offset)
        tt = d['time'][:].astype(np.int64)
        lat, lon = d['latitude'][:], d['longitude'][:]
    assert raw.dtype == np.int16 and raw.shape[1:] == (r1 - r0, NLON), raw.shape
    assert np.array_equal(lat, 90 - 0.25 * np.arange(NLAT)) and np.array_equal(lon, -180 + 0.25 * np.arange(NLON))
    assert (np.diff(tt) == 1).all()
    n_fill = int((raw == FILL).sum())
    return raw, sc, off, tt, n_fill, time.time() - t0


@numba.njit(inline='always')
def _bin(x, edges):
    """searchsorted(edges, x, 'right') - 1 with the last bin closed on the right; -1 if outside (or NaN)."""
    n = edges.shape[0] - 1
    if not (x >= edges[0] and x <= edges[n]):
        return -1
    if x == edges[n]:
        return n - 1
    i = int((x - edges[0]) * n / (edges[n] - edges[0]))
    if i < 0:
        i = 0
    if i > n - 1:
        i = n - 1
    while i > 0 and edges[i] > x:
        i -= 1
    while i < n - 1 and edges[i + 1] <= x:
        i += 1
    return i


@numba.njit(parallel=True)
def accumulate(hist, nout, ru, rv, su, ou, sv, ov, ume, uae):
    """hist (R, NLON, NB, NB) uint32 += counts of hours; nout (R, NLON) += hours outside the bins."""
    T, R, L = ru.shape
    for i in numba.prange(R):
        for j in range(L):
            for t in range(T):
                u = np.float64(ru[t, i, j]) * su + ou
                v = np.float64(rv[t, i, j]) * sv + ov
                um = np.sqrt(u * u + v * v)
                ua = np.arctan2(v, u)
                a = _bin(um, ume)
                b = _bin(ua, uae)
                if a < 0 or b < 0:
                    nout[i, j] += 1
                else:
                    hist[i, j, a, b] += 1
    return 0


def selftest():
    import xarray as xr
    from xhistogram.xarray import histogram
    rng = np.random.default_rng(0)
    T, R, L = 3000, 3, 5
    ru = rng.integers(-32000, 32000, (T, R, L)).astype(np.int16)
    rv = rng.integers(-32000, 32000, (T, R, L)).astype(np.int16)
    su, ou, sv, ov = 0.0009528005794194337, -1.4727359217740847, 0.0010343099370617667, 1.9175431477658442
    ru[:5, 0, 0] = 0
    rv[:5, 0, 0] = 0
    # 1) packed int16 path, as used on the files
    hist = np.zeros((R, L, NB, NB), np.uint32)
    nout = np.zeros((R, L), np.uint32)
    accumulate(hist, nout, ru, rv, su, ou, sv, ov, UM_EDGES, UA_EDGES)
    u = ru.astype(np.float64) * su + ou
    v = rv.astype(np.float64) * sv + ov
    # 2) float path with samples exactly on bin edges: um = 0, 20 (last edge), interior edges; ua = +-pi, 0
    uf, vf = u.copy(), v.copy()
    uf[0, 1, 1], vf[0, 1, 1] = 20.0, 0.0
    uf[1, 1, 1], vf[1, 1, 1] = -5.0, 0.0
    uf[2, 1, 1], vf[2, 1, 1] = UM_EDGES[37], 0.0
    uf[3, 1, 1], vf[3, 1, 1] = -UM_EDGES[50], 0.0   # (unpacking raw * scale + offset never yields -0.0)
    uf[4, 1, 1], vf[4, 1, 1] = 0.0, 0.0
    uf[5, 1, 1], vf[5, 1, 1] = 20.0000001, 0.0
    hist2 = np.zeros_like(hist)
    nout2 = np.zeros_like(nout)
    accumulate(hist2, nout2, uf, vf, 1.0, 0.0, 1.0, 0.0, UM_EDGES, UA_EDGES)
    for H, N, uu, vv in ((hist, nout, u, v), (hist2, nout2, uf, vf)):
        ds = xr.Dataset(dict(u10=(('time', 'latitude', 'longitude'), uu), v10=(('time', 'latitude', 'longitude'), vv)))
        um = (ds.u10**2 + ds.v10**2)**0.5
        ua = np.arctan2(ds.v10, ds.u10)
        um.name, ua.name = 'um', 'ua'
        ref = histogram(um, ua, bins=[UM_EDGES, UA_EDGES], dim=['time']).transpose('latitude', 'longitude', ...).values
        assert np.array_equal(H, ref), np.abs(H.astype(int) - ref).max()
        for i in range(R):
            for j in range(L):
                h2, _, _ = np.histogram2d(um.values[:, i, j], ua.values[:, i, j], bins=[UM_EDGES, UA_EDGES])
                assert np.array_equal(H[i, j], h2)
        assert np.array_equal(H.sum((2, 3)) + N, np.full((R, L), T))
    print(json.dumps(dict(selftest='ok', samples=2 * T * R * L, counted=int(hist.sum() + hist2.sum()),
                          outside=int(nout.sum() + nout2.sum()))), flush=True)


def _write_json(path, obj):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(obj, f)
    os.replace(tmp, path)


class Reader:
    """Prefetches (u, v) bands of the next months in worker processes."""

    def __init__(self, mlist, r0, r1, nread):
        self.ex = cf.ProcessPoolExecutor(max_workers=nread, mp_context=mp.get_context('spawn'))
        self.mlist, self.r0, self.r1 = mlist, r0, r1
        self.q = []
        self.k = 0
        for _ in range(max(1, nread // 2) + 1):
            self._submit()

    def _submit(self):
        if self.k < len(self.mlist):
            y, fu, fv = self.mlist[self.k]
            self.q.append((y, fu, self.ex.submit(read_band, fu, 'u10', self.r0, self.r1),
                           self.ex.submit(read_band, fv, 'v10', self.r0, self.r1)))
            self.k += 1

    def __iter__(self):
        while self.q:
            y, fu, a, b = self.q.pop(0)
            self._submit()
            yield y, fu, a.result(), b.result()
        self.ex.shutdown()


def run_months(hist, nout, mlist, r0, r1, nread, log=None, on_year_done=None):
    """Accumulate the given months; returns per-year hour counts and timings."""
    hours = {}
    t_wait = t_hist = 0.0
    tw = time.time()
    year_prev = None
    for y, fu, (ru, su, ou, tu, fu_fill, dtu), (rv, sv, ov, tv, fv_fill, dtv) in Reader(mlist, r0, r1, nread):
        t_wait += time.time() - tw
        assert np.array_equal(tu, tv), fu
        assert fu_fill == 0 and fv_fill == 0, (fu, fu_fill, fv_fill)
        if year_prev is not None and y != year_prev and on_year_done:
            on_year_done(year_prev, hours)
        year_prev = y
        t0 = time.time()
        accumulate(hist, nout, ru, rv, su, ou, sv, ov, UM_EDGES, UA_EDGES)
        dt = time.time() - t0
        t_hist += dt
        hours[y] = hours.get(y, 0) + len(tu)
        if log:
            log.write(json.dumps(dict(file=os.path.basename(fu), hours=len(tu), t0_h=int(tu[0]), read_u_s=round(dtu, 2),
                                      read_v_s=round(dtv, 2), hist_s=round(dt, 2), t=time.strftime('%H:%M:%S'))) + '\n')
            log.flush()
        tw = time.time()
    if year_prev is not None and on_year_done:
        on_year_done(year_prev, hours)
    return hours, t_wait, t_hist


def init(out):
    import zarr
    from numcodecs import Blosc
    lat = (90 - 0.25 * np.arange(NLAT)).astype(np.float32)
    lon = (-180 + 0.25 * np.arange(NLON)).astype(np.float32)
    root = zarr.open_group(out, mode='w', zarr_format=2)
    comp = Blosc(cname='lz4', clevel=5, shuffle=Blosc.SHUFFLE)
    h = root.create_array('histogram_um_ua', shape=(NLAT, NLON, NB, NB), chunks=(LAT_CHUNK, LON_CHUNK, NB, NB),
                          dtype='uint32', fill_value=None, compressors=comp)
    h.attrs.update({'_ARRAY_DIMENSIONS': ['latitude', 'longitude', 'um_bin', 'ua_bin'],
                    'long_name': 'Number of hours per 10 m wind speed and direction bin',
                    'description': 'Number of hourly samples 1950-01-01T00 to 2024-12-31T23 in each (um_bin, ua_bin); '
                                   'hours with wind speed above 20 m/s are not counted.'})
    for name, vals, attrs in (
            ('latitude', lat, dict(long_name='latitude', units='degrees_north')),
            ('longitude', lon, dict(long_name='longitude', units='degrees_east')),
            ('um_bin', 0.5 * (UM_EDGES[1:] + UM_EDGES[:-1]),
             dict(long_name='10 m wind speed bin centre', units='m s**-1', bin_edges=UM_EDGES.tolist())),
            ('ua_bin', 0.5 * (UA_EDGES[1:] + UA_EDGES[:-1]),
             dict(long_name='10 m wind direction bin centre (arctan2(v10, u10), toward, CCW from east)', units='rad',
                  bin_edges=UA_EDGES.tolist()))):
        a = root.create_array(name, shape=vals.shape, chunks=vals.shape, dtype=vals.dtype, compressors=comp,
                              fill_value=np.nan)
        a[:] = vals
        a.attrs.update({'_ARRAY_DIMENSIONS': [name], **attrs})
    root.attrs.update({
        'title': 'ERA5 hourly 10 m wind speed and direction histograms, 1950-2024',
        'source': 'ERA5 hourly reanalysis on single levels (Hersbach et al. 2020), 10u and 10v, 0.25 deg grid, '
                  'NCI replica /g/data/rt52/era5/single-levels/reanalysis',
        'period': '1950-01-01T00 to 2024-12-31T23 (%d hours)' % n_hours(),
        'n_hours': n_hours(),
        'method': 'um = (u10^2 + v10^2)^0.5, ua = arctan2(v10, u10); counts per bin over all hours; bins closed on '
                  'the left, last bin closed on both sides; hours with um > 20 m/s not counted. Same bins as the '
                  'ERA5-Land histogram store.',
        'code': 'dune-atlas pipeline/gadi/era5/era5_hist.py',
        'date_created': time.strftime('%Y-%m-%d')})
    print('init', out, flush=True)


def band(out, work, b, nread):
    import zarr
    from numcodecs import Blosc
    r0, r1 = band_rows(b)
    bd = f'{work}/band_{b:02d}'
    os.makedirs(bd, exist_ok=True)
    st_path = f'{bd}/status.json'
    st = json.load(open(st_path)) if os.path.exists(st_path) else {}
    if st.get('state') == 'written':
        print('band already written', b, flush=True)
        return
    hist = np.zeros((r1 - r0, NLON, NB, NB), np.uint32)
    nout = np.zeros((r1 - r0, NLON), np.uint32)
    hours = {}
    y_start = Y0
    ck = f'{bd}/checkpoint.zarr'
    ckpt = st.get('checkpoint_through')
    if ckpt and os.path.exists(ck):
        g = zarr.open_group(ck, mode='r')
        hist[:] = g['hist'][:]
        nout[:] = g['nout'][:]
        hours = {int(k): v for k, v in st['checkpoint_hours'].items()}
        y_start = ckpt + 1
        print('resumed from checkpoint through', ckpt, flush=True)
    else:
        ckpt = None
    state = dict(checkpoint_through=ckpt, checkpoint_hours={str(k): v for k, v in hours.items()})
    log = open(f'{bd}/progress.jsonl', 'a')
    t00 = time.time()

    def year_done(y, hrs):
        hours.update(hrs)
        assert hours[y] == n_hours(y, y), (y, hours[y])
        if (y - Y0 + 1) % CKPT_YEARS == 0 and y < Y1:
            tmp = ck + '.tmp'
            if os.path.exists(tmp):
                shutil.rmtree(tmp)
            g = zarr.open_group(tmp, mode='w', zarr_format=2)
            comp = Blosc(cname='lz4', clevel=1, shuffle=Blosc.SHUFFLE)
            g.create_array('hist', data=hist, chunks=(LAT_CHUNK, LON_CHUNK, NB, NB), compressors=comp)
            g.create_array('nout', data=nout, chunks=nout.shape, compressors=comp)
            if os.path.exists(ck):
                os.rename(ck, ck + '.old')
            os.rename(tmp, ck)
            if os.path.exists(ck + '.old'):
                shutil.rmtree(ck + '.old')
            state['checkpoint_through'] = y
            state['checkpoint_hours'] = {str(k): v for k, v in hours.items()}
        _write_json(st_path, dict(state='running', band=b, rows=[r0, r1], last_year=y,
                                  hours={str(k): v for k, v in hours.items()}, elapsed_s=round(time.time() - t00),
                                  **state))

    mlist = months(y_start, Y1)
    _, t_wait, t_hist = run_months(hist, nout, mlist, r0, r1, nread, log, year_done)
    assert sum(hours.values()) == n_hours() and len(hours) == Y1 - Y0 + 1, hours
    tot = hist.sum((2, 3), dtype=np.uint64) + nout
    assert (tot == n_hours()).all(), (int(tot.min()), int(tot.max()))
    arr = zarr.open_array(f'{out}/histogram_um_ua', mode='r+')
    t0 = time.time()
    arr[r0:r1] = hist
    np.save(f'{bd}/nout.npy', nout)
    _write_json(st_path, dict(state='written', band=b, rows=[r0, r1], hours={str(k): v for k, v in hours.items()},
                              n_hours=n_hours(), counted=int(hist.sum(dtype=np.uint64)),
                              outside=int(nout.sum(dtype=np.uint64)), nout_max=int(nout.max()),
                              t_wait_s=round(t_wait), t_hist_s=round(t_hist), t_write_s=round(time.time() - t0),
                              elapsed_s=round(time.time() - t00), resumed_from=ckpt))
    if os.path.exists(ck):
        shutil.rmtree(ck)
    print('band written', b, r0, r1, round(time.time() - t00), flush=True)


def pilot(work, b, year, nread):
    r0, r1 = band_rows(b)
    os.makedirs(work, exist_ok=True)
    hist = np.zeros((r1 - r0, NLON, NB, NB), np.uint32)
    nout = np.zeros((r1 - r0, NLON), np.uint32)
    t = time.time()
    accumulate(hist[:1, :1], nout[:1, :1], np.zeros((2, 1, 1), np.int16), np.zeros((2, 1, 1), np.int16),
               1.0, 0.0, 1.0, 0.0, UM_EDGES, UA_EDGES)
    print(json.dumps(dict(jit_s=round(time.time() - t, 1), threads=numba.get_num_threads())), flush=True)
    hist[:] = 0
    nout[:] = 0
    log = open(f'{work}/pilot_progress.jsonl', 'w')
    t0 = time.time()
    hours, t_wait, t_hist = run_months(hist, nout, months(year, year), r0, r1, nread, log)
    el = time.time() - t0
    assert hours[year] == n_hours(year, year)
    tot = hist.sum((2, 3), dtype=np.uint64) + nout
    assert (tot == n_hours(year, year)).all()
    res = dict(band=b, rows=[r0, r1], year=year, hours=hours[year], elapsed_s=round(el, 1), wait_s=round(t_wait, 1),
               hist_s=round(t_hist, 1), threads=numba.get_num_threads(), nread=nread, outside=int(nout.sum()),
               nonzero_bins=int((hist > 0).sum()))
    np.save(f'{work}/pilot_hist_band{b:02d}_{year}_rows0-1_cols0-4.npy', hist[:2, :5])
    _write_json(f'{work}/pilot.json', res)
    print(json.dumps(res), flush=True)


def hours_check(work):
    out = {}
    prev_end = None
    for y in range(Y0, Y1 + 1):
        n = {}
        for var in ('10u', '10v'):
            nv = 0
            for f in files(var, y):
                with netCDF4.Dataset(f) as d:
                    tt = d['time'][:].astype(np.int64)
                assert (np.diff(tt) == 1).all(), f
                if var == '10u':
                    if prev_end is not None:
                        assert tt[0] == prev_end + 1, f
                    prev_end = tt[-1]
                nv += len(tt)
            n[var] = nv
        assert n['10u'] == n['10v'] == n_hours(y, y), (y, n)
        out[y] = n['10u']
    res = dict(hours_per_year=out, total=sum(out.values()), expected=n_hours(),
               first_hour_since_1900=None, last_hour_since_1900=int(prev_end))
    with netCDF4.Dataset(files('10u', Y0)[0]) as d:
        res['first_hour_since_1900'] = int(d['time'][0])
    assert res['total'] == res['expected']
    assert res['first_hour_since_1900'] == n_hours(1900, Y0 - 1) and res['last_hour_since_1900'] == n_hours(1900, Y1) - 1
    _write_json(f'{work}/hours.json', res)
    print(json.dumps(dict(total=res['total'], expected=res['expected'], years=len(out),
                          first=res['first_hour_since_1900'], last=res['last_hour_since_1900'])), flush=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'init':
        init(sys.argv[2])
    elif cmd == 'band':
        band(sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]) if len(sys.argv) > 5 else 4)
    elif cmd == 'pilot':
        pilot(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]) if len(sys.argv) > 5 else 4)
    elif cmd == 'hours':
        hours_check(sys.argv[2])
    elif cmd == 'selftest':
        selftest()
