"""ERA5 vs ERA5-Land at the atlas's dune cells, one threshold (run locally).

Each ERA5-Land dune cell (layers.nc `dunes`, 0.1 deg) is paired with the ERA5 0.25 deg cell that contains its
centre (ERA5 cell edges at +-0.125 deg around centres 90 - 0.25 i, -180 + 0.25 j). ERA5 values come from
`validate_era5.py slice` (npz of all fields at one ut); ERA5-Land values from qsat_view.open_qsat.

  python compare_era5_era5land.py ERA5_SLICE.npz OUTDIR [DATA_DIR]
"""
import json
import os
import sys

import numpy as np


def main(npz, outdir, data_dir=None):
    import xarray as xr
    from dune_atlas_pipeline import qsat_view, constants as C
    data_dir = data_dir or os.environ.get('DUNE_WORLD_DATA', os.path.expanduser('~/Documents/research/projects/dune-world/data'))
    os.makedirs(outdir, exist_ok=True)
    e = np.load(npz)
    ut = float(e['ut'])
    k = int(np.argmin(np.abs(C.UT_VALUES - ut)))
    assert abs(C.UT_VALUES[k] - ut) < 1e-12
    L = xr.open_dataset(f'{data_dir}/layers.nc')
    dunes = L.dunes.values.astype(bool)
    lat = L.y.values
    lon = L.x.values
    ii, jj = np.nonzero(dunes)
    ei = np.rint((90 - lat[ii]) / 0.25).astype(int)
    ej = np.rint((lon[jj] + 180) / 0.25).astype(int) % 1440
    q = qsat_view.open_qsat(data_dir)
    li = xr.DataArray(ii, dims='cell')
    lj = xr.DataArray(jj, dims='cell')
    land = {v: q[v].isel(ut=k, latitude=li, longitude=lj).values for v in ('dpm', 'rdpa', 'qha_rdp_dp')}
    era5 = {v: e[v][ei, ej].astype(np.float64) for v in ('dpm', 'rdpa', 'qha_rdp_dp')}
    ok = np.isfinite(land['dpm']) & np.isfinite(era5['dpm'])
    s2y = C.S2Y
    dpl, dpe = land['dpm'][ok] * s2y, era5['dpm'][ok] * s2y
    both = (dpl > 0) & (dpe > 0)
    ratio = dpe[both] / dpl[both]
    rl, re = land['rdpa'][ok], era5['rdpa'][ok]
    dd = np.degrees(np.abs((re - rl + np.pi) % (2 * np.pi) - np.pi))
    m_dir = (land['qha_rdp_dp'][ok] > 0.2) & (era5['qha_rdp_dp'][ok] > 0.2)    # directions meaningful
    pl, pe = land['qha_rdp_dp'][ok], era5['qha_rdp_dp'][ok]
    pm = np.isfinite(pl) & np.isfinite(pe)

    def qs(x):
        return {p: float(np.percentile(x, p)) for p in (5, 25, 50, 75, 95)}

    res = dict(ut=ut, n_dune_cells=int(dunes.sum()), n_paired=int(ok.sum()), n_era5_cells=int(len(set(zip(ei[ok], ej[ok])))),
               dp_m2_per_yr=dict(era5_land=qs(dpl), era5=qs(dpe)),
               dp_zero=dict(era5_land=int((dpl == 0).sum()), era5=int((dpe == 0).sum())),
               dp_ratio_era5_over_era5land=qs(ratio),
               dp_log10_pearson_r=float(np.corrcoef(np.log10(dpl[both]), np.log10(dpe[both]))[0, 1]),
               rdd_abs_diff_deg=dict(all=qs(dd), rdp_dp_gt_0p2=qs(dd[m_dir]), n_rdp_dp_gt_0p2=int(m_dir.sum()),
                                     frac_within_30deg_rdp_dp_gt_0p2=float((dd[m_dir] <= 30).mean())),
               rdp_dp=dict(era5_land=qs(pl[pm]), era5=qs(pe[pm]), diff_era5_minus_land=qs(pe[pm] - pl[pm]),
                           pearson_r=float(np.corrcoef(pl[pm], pe[pm])[0, 1])))
    with open(f'{outdir}/era5_vs_era5land_dunes_ut{k:02d}.json', 'w') as f:
        json.dump(res, f, indent=1)
    np.savez_compressed(f'{outdir}/era5_vs_era5land_dunes_ut{k:02d}.npz', dp_land=dpl, dp_era5=dpe, rdd_land=rl, rdd_era5=re,
                        rdpdp_land=pl, rdpdp_era5=pe)
    print(json.dumps(res, indent=1))
    return res


if __name__ == '__main__':
    main(*sys.argv[1:])
