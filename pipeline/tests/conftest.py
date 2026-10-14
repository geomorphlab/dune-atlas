"""Shared skip guards of the pipeline tests. Tests that need data which are not in the repository are
marked and skipped when those data are absent, so the suite runs anywhere; CI runs it without them.

Markers:  data     needs the source data directory (DUNE_WORLD_DATA)
          staging  needs local working stores under staging/ (built by the pipeline, not in git)
          tools    needs an optional tool or package (tippecanoe, numba, pmtiles)
Select, e.g.:  pytest -m "not data and not staging"
"""
import os
import pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
SOURCE_DATA = os.environ.get("DUNE_WORLD_DATA", "")
DRIFT_STORE = pathlib.Path(os.environ.get("DUNE_ATLAS_DRIFT", REPO / "staging" / "drift" / "qsat_drift.zarr"))


def have_source_data() -> bool:
    return bool(SOURCE_DATA) and os.path.isdir(SOURCE_DATA)


def have_drift_store() -> bool:
    return (DRIFT_STORE / "zarr.json").exists()


def pytest_configure(config):
    for m in ("data: needs the source data directory (DUNE_WORLD_DATA)",
              "staging: needs local working stores under staging/ (not in git)",
              "tools: needs an optional tool or package (tippecanoe, numba, pmtiles)"):
        config.addinivalue_line("markers", m)
