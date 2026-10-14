# Getting started

## Prerequisites

- Node 22 (the app; `app/`)
- Python 3.11 or later (the data pipeline; `pipeline/`): `pip install -e "pipeline[test,tiles]"`. Optional:
  `tippecanoe` (dune vector tiles; conda-forge) and `numba` (`pipeline[fast]`, faster Mars cell builds).

## Run the app

```bash
cd app && npm ci
npm run dev                     # Earth atlas at http://localhost:5173/, reading https://data.geomorphlab.org
npm run dev:mars                # Mars atlas (VITE_BODY=mars)
```

Build-time settings are Vite environment variables (see [architecture.md](architecture.md), "Build-time
configuration"); `VITE_DATA_BASE` points the app at another data server.

## Test stores (fixtures)

Several tests read small local stores under `staging/` (not in git). Two kinds can be built:

```bash
# synthetic stores (what CI uses; no source data needed): Earth ~2 min, Mars ~5 min with 8 workers
PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.synthetic_fixture --out staging/fixture
python scripts/mars/app/make_fixture.py --out staging/fixture-mars

# Earth stores from the source data (DUNE_WORLD_DATA = directory of the paper's data record)
PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.cli fixture --data "$DUNE_WORLD_DATA" --out staging/fixture
```

Tests that compare with published numbers run only on stores built from the source data (the synthetic
`decode_reference.json` carries `"synthetic": true`).

To run the app against a local store, serve it with HTTP range requests and CORS (as the data bucket does):

```bash
python scripts/serve_data.py staging/fixture --port 8787
cd app && VITE_DATA_BASE=http://127.0.0.1:8787 npm run dev
node app/scripts/check-decode.mjs staging/fixture staging/fixture/decode_reference.json   # decode check, no server
```

## Tests

```bash
cd app
npm test                        # Earth (vitest); FULL_SWEEP=1 sweeps all 64 slider positions (CI on main)
npm run test:mars               # Mars
npm run validate-registry && npm run validate-registry:mars
npm run test:ci                 # the app checks from a clean export, without staging/ (only for build/CI changes; CI is the full gate)
cd .. && python -m pytest pipeline/tests -q    # pipeline; tests that need data skip without it
```

Pipeline test markers: `data` (needs `DUNE_WORLD_DATA`), `staging` (needs local stores under `staging/`),
`tools` (needs `tippecanoe`, `numba` or `pmtiles`); select with e.g. `-m "not data"`.

## Refactoring checks

`tools/checks/equivalence.sh <baseline-dir> [<ref>]` builds both atlases from a clean export and compares the
build trees, the built text and snapshots of the registry, layer and cell panels, data requests and downloads
with a baseline (see [docs/records/refactor-baseline.md](../records/refactor-baseline.md)).

## HPC jobs

The large builds run on NCI Gadi (PBS) from `pipeline/gadi/`. Copy `pipeline/gadi/site.example.env` to
`pipeline/gadi/site.env` (git-ignored) and fill in the project, storage flags, interpreter and work directory;
`pipeline/gadi/mars_terrain/stage_and_submit.sh` fills the job templates from it.
