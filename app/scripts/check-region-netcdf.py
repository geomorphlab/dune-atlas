"""Read a region export back with xarray (CF decoding) and compare it with the per-cell exports of two of its
cells (scripts/write-region-export.ts).   python scripts/check-region-netcdf.py <out dir>"""
import json, sys
from pathlib import Path
import numpy as np
import xarray as xr

out = Path(sys.argv[1] if len(sys.argv) > 1 else "../staging/check-region")
r = xr.open_dataset(out / "region.nc")
cur = xr.open_dataset(out / "region-current.nc")
assert r.attrs["Conventions"] == "CF-1.8"
assert r["lat"].attrs["standard_name"] == "latitude" and r["lon"].attrs["units"] == "degrees_east"
assert np.all(np.diff(r["lon"].values) > 0) and np.all(np.diff(r["lat"].values) < 0)
assert r["dpm"].dims == ("ut", "lat", "lon") and cur["dpm"].dims == ("lat", "lon")
n = 0
for c in json.load(open(out / "cells.json")):
    one = xr.open_dataset(out / c["file"])
    sel = dict(lat=c["row"], lon=c["col"])
    assert abs(float(r["lat"][c["row"]]) - float(one["latitude"])) < 1e-9
    for v in [v for v in one.data_vars if v in r.data_vars and "ut" in one[v].dims]:
        a, b = r[v].isel(**sel).values, one[v].values
        assert np.allclose(a, b, equal_nan=True), v
        assert np.allclose(cur[v].isel(**sel).values, b[14], equal_nan=True), v
        n += 1
    assert np.array_equal(r["wind_hist"].isel(**sel).values, one["wind_hist"].values)
    assert int(r["dune_present"].isel(**sel)) == int(one["dune_present"])
print(f"region netcdf OK: {dict(r.sizes)}; {n} threshold series equal to the per-cell exports")
