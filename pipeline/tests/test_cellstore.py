"""cellstore.write_region on small regions written to tmp: edge shards, resume, ocean skip,
multi-worker parity, hygiene (requires local source data)."""
import json
import os

import numpy as np
import pytest

D = os.environ.get("DUNE_WORLD_DATA", "")
from conftest import have_drift_store, have_source_data

pytestmark = [pytest.mark.data, pytest.mark.staging,
              pytest.mark.skipif(not (have_source_data() and have_drift_store()), reason="source data or drift store not available")]

EDGE = (1792, 1801, 3584, 3600)   # last source chunk: 9 rows (1801 = 112*16 + 9) x last 16 columns, Antarctica
OCEAN_BLOCK = (1088, 1152, 1856, 1920)  # South Atlantic, no land


def _src():
    from dune_atlas_pipeline import cellstore as cs
    return cs.open_sources(D)


def _quiet(*a, **k):
    pass


def test_edge_shard_exact_and_resume(tmp_path):
    import zarr
    from dune_atlas_pipeline import cellstore as cs
    out = str(tmp_path / "edge.zarr")
    assert cs.write_region(out, D, *EDGE, log=_quiet) == 1
    g = zarr.open_group(out, mode="r")
    assert g["hist"].shape[:2] == (1801, 3600)
    dh, dq = _src()
    y0, y1, x0, x1 = EDGE
    src = dh.histogram_um_ua.isel(latitude=slice(y0, y1), longitude=slice(x0, x1)).values
    got = g["hist"][y0:y1, x0:x1]
    assert got.dtype == np.uint32 and np.array_equal(got.astype(np.int64), src)
    fv = np.stack([dq[v].isel(latitude=slice(y0, y1), longitude=slice(x0, x1)).values for v in cs.FIELD_VARS], 0)
    exp = np.moveaxis(fv, (0, 1), (2, 3)).astype(np.float32)
    assert np.array_equal(g["fields"][y0:y1, x0:x1], exp, equal_nan=True)
    # shard object for the truncated edge shard exists; manifest lists it
    shard = os.path.join(out, "hist", "c", str(y0 // 16), str(x0 // 16), "0", "0")
    assert os.path.exists(shard)
    m = cs.load_manifest(out)
    assert [y0, x0] in m["done"] and m["anomalies"] == []
    # resume: nothing left to do
    assert cs.write_region(out, D, *EDGE, log=_quiet) == 0
    # simulate an interrupted run: shard lost and not in manifest -> rewritten exactly
    os.remove(shard)
    m["done"] = [d for d in m["done"] if d != [y0, x0]]
    cs.save_manifest(out, m)
    assert cs.write_region(out, D, *EDGE, log=_quiet) == 1
    g = zarr.open_group(out, mode="r")
    assert np.array_equal(g["hist"][y0:y1, x0:x1].astype(np.int64), src)
    assert not cs.apple_junk(out)
    assert not os.path.exists(cs.manifest_path(out) + ".tmp")


def test_ocean_block_skipped_without_read(tmp_path, monkeypatch):
    from dune_atlas_pipeline import cellstore as cs

    def boom(*a, **k):
        raise AssertionError("ocean-only block must not be read")
    monkeypatch.setattr(cs, "_do_block", boom)
    out = str(tmp_path / "ocean.zarr")
    assert cs.write_region(out, D, *OCEAN_BLOCK, log=_quiet) == 0
    m = cs.load_manifest(out)
    assert len(m["done"]) == 16 and m["blocks"]["1088,1856"]["shards"] == 0
    assert not os.path.exists(os.path.join(out, "hist", "c"))


def test_static_arrays(tmp_path):
    import zarr
    from dune_atlas_pipeline import cellstore as cs
    out = str(tmp_path / "s.zarr")
    cs.create_store(out, D)
    g = zarr.open_group(out, mode="r")
    assert int(np.asarray(g["dunes"][:], dtype=np.int64).sum()) == 106540
    assert int(np.asarray(g["land"][:], dtype=np.int64).sum()) == 2212863
    assert g.attrs["dune_cells_without_wind"] == [[753, 1627]]  # 14.7N 17.3W, ocean in ERA5-Land
    assert g["hist"].metadata.to_dict()["codecs"][0]["configuration"]["index_location"] == "end"


def test_refuses_to_clobber(tmp_path):
    from dune_atlas_pipeline import cellstore as cs
    out = str(tmp_path / "c.zarr")
    cs.save_manifest(out, {"version": 2, "done": [[0, 0]], "blocks": {}, "anomalies": []})
    with pytest.raises(RuntimeError):
        cs.create_store(out, D)


def test_workers_match_serial(tmp_path):
    """Subprocess fan-out (2 workers) writes identical data to the serial path."""
    import zarr
    from dune_atlas_pipeline import cellstore as cs
    region = (1088, 1216, 1920, 1984)  # 2 Namib blocks, coast with ocean cells
    a, b = str(tmp_path / "a.zarr"), str(tmp_path / "b.zarr")
    na = cs.write_region(a, D, *region, workers=1, log=_quiet)
    nb = cs.write_region(b, D, *region, workers=2, log=_quiet)
    assert na == nb > 0
    ga, gb = zarr.open_group(a, mode="r"), zarr.open_group(b, mode="r")
    y0, y1, x0, x1 = region
    for name in ("hist", "fields"):
        assert np.array_equal(ga[name][y0:y1, x0:x1], gb[name][y0:y1, x0:x1], equal_nan=True)
    assert sorted(cs.load_manifest(a)["done"]) == sorted(cs.load_manifest(b)["done"])


def test_batch_flux_matches_scalar():
    from dune_atlas_pipeline import cellstore as cs, constants as C, flux
    dh, _ = _src()
    h = dh.histogram_um_ua.isel(latitude=slice(1100, 1103), longitude=slice(1950, 1952)).values
    h = h.reshape(-1, 128, 128).astype(float)
    for k in (0, 14, 30):
        B = np.array(cs.batch_dp_rdp_rdd(h, C.UT_VALUES[k])).T
        S = np.array([flux.dp_rdp_rdd(x, C.UT_VALUES[k]) for x in h])
        np.testing.assert_allclose(B, S, rtol=1e-12, atol=1e-300)


def test_apple_junk_detected(tmp_path):
    from dune_atlas_pipeline import cellstore as cs
    (tmp_path / "s.zarr" / "hist").mkdir(parents=True)
    (tmp_path / "s.zarr" / ".DS_Store").write_bytes(b"x")
    (tmp_path / "s.zarr" / "hist" / "._zarr.json").write_bytes(b"x")
    assert len(cs.apple_junk(str(tmp_path / "s.zarr"))) == 2


def test_manifest_atomic_roundtrip(tmp_path):
    from dune_atlas_pipeline import cellstore as cs
    out = str(tmp_path / "x.zarr")
    m = {"version": 2, "done": [[16, 32]], "blocks": {"0,0": {"shards": 1}}, "anomalies": []}
    cs.save_manifest(out, m)
    assert json.load(open(cs.manifest_path(out))) == m and cs.load_manifest(out) == m
