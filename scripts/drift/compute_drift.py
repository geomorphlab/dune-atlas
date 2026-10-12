"""Drift potential DP, resultant drift potential RDP and resultant drift direction RDD of the
time-averaged flat-bed saturated flux, for every land cell at all 64 u*,th.

Hist h[s, d] = hours in speed bin s and direction bin d; q_k[s] = flat-bed saturated flux at ut_k:
  DP  = sum_{s,d} h q / sum h
  RDP = |sum_{s,d} h q e^{i ua}| / sum h,   RDD = arg sum_{s,d} h q e^{i ua}
(= .weighted(hist).mean(('um_bin', 'ua_bin')), the reduction used for the other qsat parameters).
The output store (float32, NaN off land) is read by dune_atlas_pipeline.qsat_view.

Usage:
  python compute_drift.py init  OUT.zarr
  python compute_drift.py run   OUT.zarr WORKER NWORKERS     (writes OUT.zarr.log.WORKER.jsonl)
"""
import json, os, sys, time
import numpy as np, xarray as xr, zarr

D = os.environ.get('DUNE_WORLD_DATA', os.path.expanduser('~/Documents/research/projects/dune-world/data'))
B = 64
z, z0, kappa = 10, 1e-3, 0.41
g, rho_s, rho_f = 9.8, 2650, 1.2
fluxk = (5 / 0.6) / g * rho_f / rho_s
UM = 0.5 * (np.linspace(0, 20, 129)[1:] + np.linspace(0, 20, 129)[:-1])
UA = 0.5 * (np.linspace(-np.pi, np.pi, 129)[1:] + np.linspace(-np.pi, np.pi, 129)[:-1])
UT = np.linspace(0.01, 0.64, 64)
UF = UM * kappa / np.log(z / z0)
Q = np.where(UF[None, :] > UT[:, None], (UF[None, :]**2 - UT[:, None]**2) * UT[:, None] * fluxk, 0.0)  # (64 ut, 128 s)
E = np.exp(1j * UA)
VARS = ('dp', 'rdp', 'rdd')


def init(out):
    root = zarr.open_group(out, mode='w', zarr_format=3)
    for v in VARS:
        root.create_array(v, shape=(64, 1801, 3600), chunks=(64, B, B), dtype='float32', fill_value=np.nan,
                          compressors=zarr.codecs.BloscCodec(cname='zstd', clevel=5, shuffle='shuffle'),
                          dimension_names=('ut', 'latitude', 'longitude'))
    root.attrs.update(dict(description='Drift potential DP (m2/s), resultant drift potential RDP (m2/s) and resultant '
                           'drift direction RDD (rad, math convention, toward) of the time-averaged flat-bed saturated '
                           'flux, from era5-land_1950_2024_uam10_hist.zarr; land cells only (layers.nc land).',
                           ut=UT.tolist()))


def run(out, w, nw):
    land = xr.open_dataset(f'{D}/layers.nc').land.values.astype(bool)
    dh = zarr.open_array(f'{D}/era5-land_1950_2024_uam10_hist.zarr/histogram_um_ua', mode='r')
    root = zarr.open_group(out, mode='r+')
    blocks = [(by, bx) for by in range(0, 1801, B) for bx in range(0, 3600, B) if land[by:by + B, bx:bx + B].any()]
    log = open(f'{out}.log.{w}.jsonl', 'a')
    for bi, (by, bx) in enumerate(blocks):
        if bi % nw != w:
            continue
        t0 = time.time()
        m = land[by:by + B, bx:bx + B]
        H = np.asarray(dh[by:by + B, bx:bx + B])          # (64,64,128,128) int64
        h = H[m].astype(np.float64); del H                 # (n, s, d)
        tot = h.sum((1, 2))                                # (n,)
        num = np.matmul(h.transpose(0, 2, 1), Q.T)         # (n, d, k)  sum_s h q
        dp = num.sum(1) / tot[:, None]                     # (n, k)
        r = np.einsum('ndk,d->nk', num, E) / tot[:, None]
        for v, a in zip(VARS, (dp, np.abs(r), np.angle(r))):
            blk = np.full((64, B, B), np.nan, np.float32)[:, :m.shape[0], :m.shape[1]]
            blk[:, m] = a.T.astype(np.float32)
            root[v][:, by:by + m.shape[0], bx:bx + m.shape[1]] = blk
        log.write(json.dumps(dict(by=by, bx=bx, n=int(h.shape[0]), n_tot_zero=int((tot == 0).sum()),
                                  t_s=round(time.time() - t0, 2))) + '\n'); log.flush()


if __name__ == '__main__':
    if sys.argv[1] == 'init':
        init(sys.argv[2])
    else:
        run(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
