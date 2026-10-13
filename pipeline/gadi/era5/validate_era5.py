"""Checks of the ERA5 histogram and qsat stores (run inside PBS; outputs to WORKDIR).

  python validate_era5.py raw    HIST.zarr WORKDIR NPROC          independent recomputation of a few cells from the
                                                                  hourly files (xarray decoding + xhistogram)
  python validate_era5.py sums   HIST.zarr HISTWORK WORKDIR N     sum(hist) + hours above 20 m/s == hour count, N random
                                                                  cells read back from the store (+ all-cell band totals)
  python validate_era5.py slice  QSAT.zarr WORKDIR UTIDX          all 23 fields at one threshold, float32 npz
  python validate_era5.py cells  HIST.zarr CELLS.npy WORKDIR      qsat_compute.qsat_fields for listed cells of any
                                                                  histogram store (e.g. ERA5-Land), npz
Requires PYTHONPATH to contain the pipeline's src/ directory for `cells`.
"""
import concurrent.futures as cf
import json
import os
import sys
import time

import numpy as np

ROOT = '/g/data/rt52/era5/single-levels/reanalysis'
# (name, lat, lon): dune areas, a high-wind ocean cell (hours above 20 m/s), the pole row, the first/last columns
RAW_CELLS = [('sahara', 25.0, 10.0), ('namib', -24.5, 15.25), ('taklamakan', 39.0, 83.0),
             ('drake_passage', -57.0, -65.0), ('north_pole_row', 90.0, -180.0), ('equator_last_col', 0.0, 179.75)]


def _plain(o):
    return o.item() if hasattr(o, 'item') else str(o)


def _write_json(path, obj):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(obj, f, indent=1, default=_plain)
    os.replace(tmp, path)


def _read_point(args):
    import xarray as xr
    fu, fv, idx = args
    out = []
    with xr.open_dataset(fu) as du, xr.open_dataset(fv) as dv:
        for i, j in idx:
            u = du.u10.isel(latitude=i, longitude=j).values
            v = dv.v10.isel(latitude=i, longitude=j).values
            out.append((u, v))
        dtype = str(du.u10.dtype)
        t = du.time.values
    return out, dtype, t[0], len(t)


def raw(hist, work, nproc):
    import xarray as xr
    import zarr
    from xhistogram.xarray import histogram
    os.makedirs(work, exist_ok=True)
    idx = [(int(round((90 - la) / 0.25)), int(round((lo + 180) / 0.25))) for _, la, lo in RAW_CELLS]
    jobs = []
    for y in range(1950, 2025):
        fu = sorted(os.listdir(f'{ROOT}/10u/{y}'))
        fv = sorted(os.listdir(f'{ROOT}/10v/{y}'))
        assert len(fu) == len(fv) == 12
        jobs += [(f'{ROOT}/10u/{y}/{a}', f'{ROOT}/10v/{y}/{b}', idx) for a, b in zip(fu, fv)]
    t0 = time.time()
    with cf.ProcessPoolExecutor(nproc) as ex:
        res = list(ex.map(_read_point, jobs, chunksize=4))
    u = np.concatenate([[r[0][k][0] for k in range(len(idx))] for r in res], axis=1)   # (cells, hours)
    v = np.concatenate([[r[0][k][1] for k in range(len(idx))] for r in res], axis=1)
    dtypes = sorted({r[1] for r in res})
    n = u.shape[1]
    t_read = time.time() - t0
    H = zarr.open_array(f'{hist}/histogram_um_ua', mode='r')
    umb = np.linspace(0, 20, 129)
    uab = np.linspace(-np.pi, np.pi, 129)
    out = dict(n_hours=n, decoded_dtypes=dtypes, t_read_s=round(t_read), first_time=str(res[0][2]), cells=[])
    for k, (name, la, lo) in enumerate(RAW_CELLS):
        ds = xr.Dataset(dict(u10=(('time',), u[k]), v10=(('time',), v[k])))
        um = (ds.u10**2 + ds.v10**2)**0.5
        ua = np.arctan2(ds.v10, ds.u10)
        um.name, ua.name = 'um', 'ua'
        ref = histogram(um, ua, bins=[umb, uab], dim=['time']).values
        got = np.asarray(H[idx[k][0], idx[k][1]]).astype(np.int64)
        out['cells'].append(dict(name=name, lat=la, lon=lo, i=idx[k][0], j=idx[k][1], identical=bool(np.array_equal(ref, got)),
                                 max_abs_diff=int(np.abs(ref - got).max()), n_diff_bins=int((ref != got).sum()),
                                 counted=int(got.sum()), hours_above_20=int((um.values > 20).sum()),
                                 sum_plus_above=int(got.sum() + (um.values > 20).sum())))
    print(json.dumps(out, default=_plain), flush=True)
    np.savez_compressed(f'{work}/raw_cells_uv.npz', u=u, v=v, idx=np.array(idx))
    _write_json(f'{work}/raw_cells.json', out)


def sums(hist, histwork, work, n):
    import zarr
    os.makedirs(work, exist_ok=True)
    H = zarr.open_array(f'{hist}/histogram_um_ua', mode='r')
    nout = np.concatenate([np.load(f'{histwork}/band_{b:02d}/nout.npy') for b in range(8)])
    assert nout.shape == (721, 1440)
    st = [json.load(open(f'{histwork}/band_{b:02d}/status.json')) for b in range(8)]
    N = st[0]['n_hours']
    rng = np.random.default_rng(11)
    ii = rng.integers(0, 721, n)
    jj = rng.integers(0, 1440, n)
    bad = 0
    tot = []
    for i, j in zip(ii, jj):
        s = int(np.asarray(H[i, j]).sum(dtype=np.int64))
        tot.append(s)
        bad += int(s + int(nout[i, j]) != N)
    tot = np.array(tot)
    out = dict(n_hours=N, sampled=int(n), mismatches=bad, band_states=[s['state'] for s in st],
               band_counted_plus_outside=[s['counted'] + s['outside'] for s in st],
               band_expected=[(s['rows'][1] - s['rows'][0]) * 1440 * N for s in st],
               sampled_sum_min=int(tot.min()), sampled_sum_max=int(tot.max()),
               hours_above_20_max=int(nout.max()), hours_above_20_cells_gt0=int((nout > 0).sum()),
               hours_above_20_frac_max=float(nout.max() / N),
               band_elapsed_s=[s['elapsed_s'] for s in st])
    np.save(f'{work}/nout_global.npy', nout)
    _write_json(f'{work}/sums.json', out)
    print(json.dumps(out), flush=True)


def slice_(qsat, work, k):
    import zarr
    os.makedirs(work, exist_ok=True)
    g = zarr.open_group(qsat, mode='r')
    names = [v for v in g.array_keys() if v not in ('ut', 'latitude', 'longitude')]
    d = {v: np.asarray(g[v][k]).astype(np.float32) for v in names}
    d['ut'] = np.float64(g['ut'][k])
    d['latitude'] = g['latitude'][:]
    d['longitude'] = g['longitude'][:]
    np.savez_compressed(f'{work}/qsat_ut{k:02d}.npz', **d)
    fin = {v: int(np.isfinite(d[v]).sum()) for v in names}
    print(json.dumps(dict(ut=float(d['ut']), finite=fin)), flush=True)


def cells(hist, cells_npy, work):
    import zarr
    from dune_atlas_pipeline import qsat_compute as Q, constants as C
    os.makedirs(work, exist_ok=True)
    cl = np.load(cells_npy)
    H = zarr.open_array(f'{hist}/histogram_um_ua', mode='r')
    h = np.stack([np.asarray(H[int(i), int(j)]) for i, j in cl])
    t0 = time.time()
    f = Q.qsat_fields(h)
    np.savez_compressed(f'{work}/cells_{os.path.basename(cells_npy)[:-4]}.npz', cells=cl, **f)
    print(json.dumps(dict(n=len(cl), s=round(time.time() - t0, 1))), flush=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'raw':
        raw(a[1], a[2], int(a[3]))
    elif a[0] == 'sums':
        sums(a[1], a[2], a[3], int(a[4]))
    elif a[0] == 'slice':
        slice_(a[1], a[2], int(a[3]))
    elif a[0] == 'cells':
        cells(a[1], a[2], a[3])
