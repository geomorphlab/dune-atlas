"""ERA5 fields for the first-look comparison: mean 10 m speed (from the histogram store), DP, RDP and RDD at the
default threshold (ut index 14) from the qsat_params store, and the ERA5 land-sea mask, to one .npz.

  python export_era5.py ERA5_HIST.zarr ERA5_QSAT.zarr OUT.npz
"""
import glob
import sys

import numpy as np
import netCDF4
import zarr

UT14 = 14
LSM_ROOT = "/g/data/rt52/era5/single-levels/reanalysis/lsm"


def main(hist, qsat, out):
    H = zarr.open_group(hist, mode="r")
    h = H["histogram_um_ua"]
    ny, nx = h.shape[:2]
    um = np.linspace(0, 20, 129)
    c = 0.5 * (um[1:] + um[:-1])
    ms = np.full((ny, nx), np.nan)
    step = h.chunks[0]
    for i in range(0, ny, step):
        b = np.asarray(h[i:i + step], dtype=np.float64)
        n = b.sum(axis=(2, 3))
        ms[i:i + step] = (b.sum(axis=3) * c).sum(axis=2) / np.where(n > 0, n, np.nan)
    Q = zarr.open_group(qsat, mode="r")
    f = sorted(glob.glob(f"{LSM_ROOT}/2000/lsm_era5_oper_sfc_200001*.nc"))[0]
    with netCDF4.Dataset(f) as d:
        lsm = np.asarray(d["lsm"][0], dtype=np.float32)
    np.savez_compressed(out, lat=H["latitude"][:], lon=H["longitude"][:], mean_speed=ms, dpm=Q["dpm"][UT14],
                        rdpm=Q["rdpm"][UT14], rdpa=Q["rdpa"][UT14], ut=Q["ut"][UT14], lsm=lsm)
    print(out, ms.shape, float(np.nanmean(ms)))


if __name__ == "__main__":
    main(*sys.argv[1:4])
