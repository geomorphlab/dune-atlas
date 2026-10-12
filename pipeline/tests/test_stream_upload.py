"""Streaming upload: local files deleted only after a verified upload; resumable; exact round trip."""
import os
from pathlib import Path

import numpy as np
import pytest

from dune_atlas_pipeline import stream_upload as su

D = os.environ.get("DUNE_WORLD_DATA", os.path.expanduser("~/Documents/research/projects/dune-world/data"))


class FlakyTarget(su.LocalTarget):
    """Fails the first `fail` puts, and can report a wrong size once."""
    def __init__(self, root, fail=0, bad_size_once=False):
        super().__init__(root); self.fail = fail; self.bad = bad_size_once; self.puts = 0
    def put(self, key, path):
        self.puts += 1
        if self.fail > 0:
            self.fail -= 1; raise IOError("simulated network error")
        super().put(key, path)
    def size(self, key):
        if self.bad:
            self.bad = False; return -1
        return super().size(key)


def test_retry_and_verify(tmp_path, monkeypatch):
    monkeypatch.setattr(su.time, "sleep", lambda s: None)
    f = tmp_path / "a.bin"; f.write_bytes(b"x" * 1000)
    t = FlakyTarget(tmp_path / "bucket", fail=2, bad_size_once=True)
    led = su.Ledger(tmp_path / "ledger.json")
    sent = su._upload_file(t, led, "p/a.bin", f, delete=True, log=lambda s: None)
    assert sent == 1000 and led.has("p/a.bin") and not f.exists()
    assert (tmp_path / "bucket" / "p/a.bin").stat().st_size == 1000 and t.puts == 4


def test_local_kept_when_upload_never_succeeds(tmp_path, monkeypatch):
    monkeypatch.setattr(su.time, "sleep", lambda s: None)
    f = tmp_path / "a.bin"; f.write_bytes(b"y" * 10)
    t = FlakyTarget(tmp_path / "bucket", fail=99)
    led = su.Ledger(tmp_path / "ledger.json")
    with pytest.raises(IOError):
        su._upload_file(t, led, "p/a.bin", f, delete=True, log=lambda s: None)
    assert f.exists() and not led.has("p/a.bin")


@pytest.mark.skipif(not os.path.isdir(D), reason="source data not available")
def test_cells_band_roundtrip_and_resume(tmp_path):
    import zarr
    from dune_atlas_pipeline import cellstore as cs
    work, bucket = tmp_path / "work", tmp_path / "bucket"
    work.mkdir()
    t = su.LocalTarget(bucket); led = su.Ledger(work / "uploaded-v1.json")
    su.stream_cells(t, led, work, "dune-atlas/v1", D, workers=2, rows=(1088, 1152), log=lambda s: None, min_free_gb=0)
    left = [p for p in (work / "cells.zarr").rglob("*") if p.is_file() and ("/hist/c/" in p.as_posix() or "/fields/c/" in p.as_posix())]
    assert left == []
    n1 = len(led.d["objects"])
    su.stream_cells(t, led, work, "dune-atlas/v1", D, workers=2, rows=(1088, 1152), log=lambda s: None, min_free_gb=0)
    assert len(led.d["objects"]) == n1  # resume: nothing new
    g = zarr.open_group(str(bucket / "dune-atlas/v1/cells.zarr"), mode="r")
    dh, dq = cs.open_sources(D)
    land = g["land"][1088:1152].astype(bool)
    i, j = np.argwhere(land)[len(np.argwhere(land)) // 2] + [1088, 0]
    assert np.array_equal(g["hist"][i, j].astype(np.int64), dh.histogram_um_ua.isel(latitude=i, longitude=j).values)
    assert list(g.attrs["field_vars"]) == cs.FIELD_VARS
