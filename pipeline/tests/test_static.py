"""Static 2-D layers reuse the field pyramid builder (length-1 ut axis)."""
import os
import numpy as np
import pytest

D = os.environ.get("DUNE_WORLD_DATA", "")
pytestmark = [pytest.mark.data, pytest.mark.skipif(not os.path.isdir(D), reason="source data not available")]


def test_aridity_static_pyramid(tmp_path):
    import xarray as xr, zarr
    from dune_atlas_pipeline import static
    da = xr.open_dataset(f"{D}/layers.nc")["aridity"]
    out = str(tmp_path / "aridity.zarr")
    st = static.build_static_pyramid(da, "aridity", out, title="Aridity index (AI)", colormap="viridis", log=True)
    g = zarr.open_group(out, mode="r")
    a0 = g["0"]["aridity"]
    assert a0.shape == (1, 1801, 3600)
    ref = da.values; v = a0[0].astype(float); ok = np.isfinite(ref)
    assert (np.isfinite(v) == ok).all()
    assert np.nanmax(np.abs(v[ok] - ref[ok]) / np.maximum(np.abs(ref[ok]), 1e-12)) <= 2 ** -12
    assert st["clim"][0] > 0 and st["clim"][1] > st["clim"][0]
    assert a0.attrs["units"] == "dimensionless"


def test_name_collision_rejected(tmp_path):
    import xarray as xr
    from dune_atlas_pipeline import static
    da = xr.open_dataset(f"{D}/layers.nc")["aridity"]
    with pytest.raises(ValueError):
        static.build_static_pyramid(da, "dpm", str(tmp_path / "x.zarr"), title="x")
