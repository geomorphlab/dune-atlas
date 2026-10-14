"""The 23 qsat fields x 64 thresholds for every cell of a wind histogram store.

Fields are computed by dune_atlas_pipeline.qsat_compute.qsat_fields, the same code that reproduces the
atlas's ERA5-Land fields (see docs/records/validation-era5.md), so both datasets follow one set of definitions.
Output: float64 (ut 64, latitude, longitude), chunks 64^3, blosc lz4 (as the ERA5-Land qsat store).

  python era5_fields.py init  HIST.zarr OUT.zarr ATTRS.json
  python era5_fields.py run   HIST.zarr OUT.zarr WORKDIR NPROC [LAT0 LAT1]   (resumable; WORKDIR/{status.json,progress.jsonl})
  python era5_fields.py time  HIST.zarr WORKDIR I0 J0 N                        (time N cells, nothing written)

Requires PYTHONPATH to contain the pipeline's src/ directory.
"""
import json
import os
import sys
import time

import numpy as np

B = 64           # output chunk (ut, lat, lon) = (64, 64, 64); one work unit = one 64 x 64 block
SUB = 256        # cells per qsat_fields call (bounds memory)


def _write_json(path, obj):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(obj, f)
    os.replace(tmp, path)


def init(hist, out, attrs_json):
    import zarr
    from numcodecs import Blosc
    from dune_atlas_pipeline import constants as C
    meta = json.load(open(attrs_json))
    h = zarr.open_group(hist, mode='r')
    lat, lon = h['latitude'][:], h['longitude'][:]
    root = zarr.open_group(out, mode='w', zarr_format=2)
    comp = Blosc(cname='lz4', clevel=5, shuffle=Blosc.SHUFFLE)
    for name, vals, attrs in (('ut', C.UT_VALUES, meta['coords']['ut']),
                              ('latitude', lat, meta['coords']['latitude']),
                              ('longitude', lon, meta['coords']['longitude'])):
        a = root.create_array(name, shape=vals.shape, chunks=vals.shape, dtype=vals.dtype, compressors=comp,
                              fill_value=np.nan)
        a[:] = vals
        a.attrs.update({'_ARRAY_DIMENSIONS': [name], **attrs})
    for v in C.QSAT_VARS:
        a = root.create_array(v, shape=(len(C.UT_VALUES), len(lat), len(lon)), chunks=(B, B, B), dtype='float64',
                              compressors=comp, fill_value=np.nan)
        a.attrs.update({'_ARRAY_DIMENSIONS': ['ut', 'latitude', 'longitude'], **meta['vars'][v]})
    root.attrs.update({**meta['root'], 'source_histograms': os.path.basename(hist.rstrip('/')),
                       'date_created': time.strftime('%Y-%m-%d')})
    print('init', out, flush=True)


def blocks(nlat, nlon, lat0=0, lat1=None):
    lat1 = nlat if lat1 is None else lat1
    return [(i, j) for i in range(lat0, lat1, B) for j in range(0, nlon, B)]


def unit(args):
    hist, out, i, j = args
    import zarr
    from dune_atlas_pipeline import qsat_compute as Q, constants as C
    t0 = time.time()
    H = zarr.open_array(f'{hist}/histogram_um_ua', mode='r')
    h = np.asarray(H[i:i + B, j:j + B])                       # (bi, bj, 128, 128)
    bi, bj = h.shape[:2]
    t_read = time.time() - t0
    flat = h.reshape(bi * bj, 128, 128)
    res = {v: np.empty((bi * bj, len(C.UT_VALUES))) for v in C.QSAT_VARS}
    for s in range(0, bi * bj, SUB):
        f = Q.qsat_fields(flat[s:s + SUB])
        for v in C.QSAT_VARS:
            res[v][s:s + SUB] = f[v]
    root = zarr.open_group(out, mode='r+')
    for v in C.QSAT_VARS:
        root[v][:, i:i + bi, j:j + bj] = res[v].reshape(bi, bj, -1).transpose(2, 0, 1)
    n_empty = int((flat.reshape(bi * bj, -1).sum(1) == 0).sum())
    return dict(i=i, j=j, n=bi * bj, n_empty=n_empty, t_read_s=round(t_read, 1), t_s=round(time.time() - t0, 1),
                pid=os.getpid(), t=time.strftime('%H:%M:%S'))


def run(hist, out, work, nproc, lat0=0, lat1=None):
    import multiprocessing as mp
    import zarr
    from dune_atlas_pipeline import qsat_compute as Q
    os.makedirs(work, exist_ok=True)
    H = zarr.open_array(f'{hist}/histogram_um_ua', mode='r')
    nlat, nlon = H.shape[:2]
    todo = blocks(nlat, nlon, lat0, lat1)
    prog = f'{work}/progress.jsonl'
    done = set()
    if os.path.exists(prog):
        for line in open(prog):
            r = json.loads(line)
            done.add((r['i'], r['j']))
    todo = [b for b in todo if b not in done]
    Q.orientation_kernels()                                     # built once, shared with forked workers
    t00 = time.time()
    n_done = len(done)
    n_all = n_done + len(todo)
    _write_json(f'{work}/status.json', dict(state='running', units_done=n_done, units_total=n_all, elapsed_s=0))
    with open(prog, 'a') as log, mp.get_context('fork').Pool(nproc, maxtasksperchild=8) as pool:
        for r in pool.imap_unordered(unit, [(hist, out, i, j) for i, j in todo]):
            log.write(json.dumps(r) + '\n')
            log.flush()
            n_done += 1
            el = time.time() - t00
            _write_json(f'{work}/status.json', dict(state='running', units_done=n_done, units_total=n_all,
                                                    elapsed_s=round(el), last=r))
    _write_json(f'{work}/status.json', dict(state='done', units_done=n_done, units_total=n_all,
                                            elapsed_s=round(time.time() - t00)))
    print('done', n_done, n_all, round(time.time() - t00), flush=True)


def time_cells(hist, work, i0, j0, n):
    import zarr
    from dune_atlas_pipeline import qsat_compute as Q
    os.makedirs(work, exist_ok=True)
    t = time.time()
    Q.orientation_kernels()
    tk = time.time() - t
    H = zarr.open_array(f'{hist}/histogram_um_ua', mode='r')
    h = np.asarray(H[i0, j0:j0 + n])
    t = time.time()
    f = Q.qsat_fields(h)
    dt = time.time() - t
    r = dict(kernel_s=round(tk, 1), n=n, s_per_cell=round(dt / n, 4), finite_dpm=int(np.isfinite(f['dpm']).sum()))
    _write_json(f'{work}/time_fields.json', r)
    print(json.dumps(r), flush=True)


if __name__ == '__main__':
    os.environ.setdefault('OMP_NUM_THREADS', '1')
    cmd = sys.argv[1]
    if cmd == 'init':
        init(*sys.argv[2:5])
    elif cmd == 'run':
        a = sys.argv[2:]
        run(a[0], a[1], a[2], int(a[3]), *(int(x) for x in a[4:6]))
    elif cmd == 'time':
        a = sys.argv[2:]
        time_cells(a[0], a[1], int(a[2]), int(a[3]), int(a[4]))
