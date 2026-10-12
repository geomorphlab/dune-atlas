"""COG fallback prototype: layout requirements of maplibre-cog-protocol and value fidelity."""
import numpy as np
import pytest

rasterio = pytest.importorskip("rasterio")
from dune_atlas_pipeline import cogs  # noqa: E402


@pytest.fixture
def arr():
    a = np.random.default_rng(1).gamma(1.0, 20.0, (180, 360)).astype("f4")   # 18 x 36 deg at 0.1
    a[:, :120] = np.nan                                                      # "ocean"
    return a


def test_cog_4326_lossless(tmp_path, arr):
    p = tmp_path / "a.tif"
    cogs.write_cog(arr, str(p), "EPSG:4326", compress="ZSTD", blocksize=256)
    with rasterio.open(p) as s:
        assert s.crs.to_epsg() == 4326 and s.block_shapes[0] == (256, 256)
        assert s.transform.a == pytest.approx(0.1) and s.transform.c == pytest.approx(-180.05)
        np.testing.assert_array_equal(s.read(1), arr)
        assert s.overviews(1)
    lv = cogs.cog_levels(str(p))
    assert lv[0]["sizes"].sum() > 0 and len(lv) >= 2


def test_cog_3857_google_tiling(tmp_path, arr):
    p = tmp_path / "b.tif"
    cogs.write_cog(arr, str(p), "EPSG:3857", compress="DEFLATE", blocksize=256)
    with rasterio.open(p) as s:
        assert s.crs.to_epsg() == 3857 and s.block_shapes[0] == (256, 256)
        assert s.profile["compress"].lower() == "deflate"
        v = s.read(1)
        fin = v[np.isfinite(v)]
        assert fin.size and np.isnan(v).any()                  # nodata kept as NaN
        assert set(np.unique(fin)) <= set(np.unique(arr[np.isfinite(arr)]))  # nearest warp: real values only
