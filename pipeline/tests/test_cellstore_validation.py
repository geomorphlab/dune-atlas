"""Validate a written cells.zarr against source (500 random land cells; ~2 min).

Store: $CELLS_STORE, else staging/regional/cells.zarr (Sahara + Namib + Taklamakan + edge),
else skipped. For the full run: CELLS_STORE=$STAGING/cells.zarr pytest pipeline/tests/test_cellstore_validation.py
"""
import os

import numpy as np
import pytest

D = os.environ.get("DUNE_WORLD_DATA", os.path.expanduser("~/Documents/research/projects/dune-world/data"))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORE = os.environ.get("CELLS_STORE", os.path.join(ROOT, "staging", "regional", "cells.zarr"))
pytestmark = pytest.mark.skipif(not (os.path.isdir(D) and os.path.isdir(STORE)),
                                reason="source data or written store not available")


@pytest.fixture(scope="module")
def res():
    from dune_atlas_pipeline import cellstore as cs
    return cs.validate_store(STORE, D, n=int(os.environ.get("CELLS_VALIDATE_N", 500)), seed=0)


def test_histograms_exact(res):
    assert res["n_checked"] >= min(500, res["n_land_candidates"])
    assert res["hist_exact"] == res["n_checked"]
    assert res["hist_sum"]["n_above"] == 0


def test_fields_exact_float32(res):
    assert res["fields_exact_float32"] == res["n_checked"]


@pytest.mark.parametrize("k", ["0", "14", "30", "63"])
def test_recompute_dp_rdp_rdd(res, k):
    r = res["recompute"][k]
    assert r["n_dp_zero_mismatch"] == 0
    if r["n"]:
        # DP/RDP/RDD in qsat_view come from the float32 drift store, so both comparisons are float32 rounding
        assert r["dp_vs_f64"] < 1.2e-7 and r["rdp_vs_f64"] < 1.2e-7 and r["rdd_vs_f64"] < 1e-6
        assert r["dp_vs_f32"] < 1.2e-7 and r["rdp_vs_f32"] < 1.2e-7 and r["rdd_vs_f32"] < 1e-6


def test_ocean_absent(res):
    assert res.get("ocean_fill", 0) == res.get("ocean_checked", 0)
    s = res["shards"]
    assert s["land_present"] == s["land"] and s["ocean_present"] == 0 and s["ocean_inner_chunks_absent"]


def test_masks_and_hygiene(res):
    assert res["dunes_sum"] == 106540 and res["land_sum"] == 2212863
    assert res["apple_junk"] == 0
    assert np.isfinite(res["t_s"])
