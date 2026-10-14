# Refactor equivalence (2026-10-14)

What was checked when the code was restructured into a shared core and per-planet folders (phases 2 and
3), against the baseline of [refactor-baseline.md](refactor-baseline.md). Visitors should see no change.

## Method

Every step was gated with `tools/checks/equivalence.sh <baseline>` (both builds from a clean export of the
working tree, then: build file lists with asset hashes masked, built-string inventories, and the snapshot of
each build). For these phases the snapshot gained an `exports` section (map- and plot-export strips as SVG,
export file names, scale bars, Web Mercator ground resolution, the map's ground resolution at the view
centre, legends of every layer incl. the dune invert, the slider readouts and ⓘ, modes and line plots,
the coordinates tooltip). The baseline for phases 2 and 3 was recorded with that snapshot at the Phase 1
tree (`6742bca`, `BASELINE=1`); its other sections equal the Phase 1 snapshot.

Snapshot sections: `body`, `registry` (merged registry per wind dataset), `info` (every info popover per
dataset), `help`, `layerPanel` (DOM per dataset), `urls` (every data URL), `exports`, `cells` (per scenario
cell on the live data: the data requests, the cell-panel DOM at three slider positions, SHA-256 of each
download). The share-link corpus (41 links per atlas) is a test and passed at every step.

## Results per step

Commits on `main` (phase 2: pull request #1; phase 3: pull request #2).

| commit | step | snapshot sections (Earth, Mars) |
|---|---|---|
| `ccc3825` | Mars sources to `app/src/bodies/mars/` | all identical; build trees identical |
| `d838d41` | per-body citation modules, shared formatting | all identical |
| `73a8bea` | per-body dataset table, sidecar variables, field metadata, help text, build defaults | all identical |
| `d4ee26e` | body profile replaces the Mars source patches; `exports` section added | all identical (incl. `exports`) |
| `2a24608` | registry split into `registry/earth/` and `registry/mars/` | all identical |
| `8c47401` | docs | — |
| `4baa0a5` | one entry module (`@body/app` hooks), per-body cell panels, no module substitution | all identical |
| `9d729c8` | shared modules under `app/src/core/` | all identical |
| `ee098c3` | wind datasets described in the registry (`info`, `credits`, `citationSources`) | all identical except `registry`: the three added keys per dataset entry (with them removed, the merged registries equal the baseline) |
| `546bc43` | counterpart guard; docs | all identical except `registry` (as above) |

The rendered texts, DOM, data requests and downloads of both atlases are therefore unchanged by the
restructuring.

**Build trees.** The file lists of both builds (asset hashes masked) are identical at every step. The
bundle hashes change from `d838d41` on, because module paths, the raw registry YAML (inlined with its
comments) and the code itself changed.

**Built strings.** Every difference was reviewed. The classes are: registry file paths and the inlined YAML
comments (registry move, comments naming source paths); template-literal fragments that split where a
wording moved into the body profile or the registry (the full texts are unchanged, as the snapshot shows);
Earth-only strings no longer in the Mars bundle (the Earth citation table, ERA5 DOIs, Copernicus notices and
Earth field descriptions, which the substituted Mars modules used to carry along); and new identifiers
(`descriptionMars`, `method_wind_regime_and_dune_orientation_fields`, `mars-dune-atlas`, `registry/earth`).

## Tests

At `546bc43`, with the synthetic test stores: Earth app tests 565 passed, 1 skipped (the local word list
is absent); Mars app tests 99 passed; pipeline tests 115 passed, 33 skipped (source data, `pmtiles`,
`tippecanoe` and `numba` absent locally); registry validation of both bodies and of the ERA5 dataset folder;
type check of the shared code with each body (`tsconfig.json`, `tsconfig.mars.json`, `tsconfig.node.json`);
`app/scripts/test-ci.sh` from a clean export.

## Deployment checks

Phase 2 (pull request #1, rebase-merged; `main` at `8c47401`): CI run 38598534688 on `main` (fixtures,
app, pipeline, deploy) succeeded. Every file of the deployed site (164 files, both atlases) is byte-identical
to a local build of `8c47401` that passed the gate; the Mars smoke test against the live site
(`scripts/mars/app/preview_smoke.mjs`) passed its 34 checks; `/`, `/mars/` and both favicons return 200.

Phase 3: pull request #2; the same checks after its deployment are listed in the pull request.

## Not done in these phases

* One cell model and one cell panel for both bodies: the Mars cell store, analysis, flux roses, downloads and
  cell panel remain counterparts of the Earth modules, guarded by `tests/mars/counterparts.test.ts`
  ([mars.md](../guide/mars.md) §6). A wind dataset with a different cell form still needs code.
* Per-body share-link id tables, the generic renaming of the threshold control (`ut` → `control`), and a
  third "toy" body as a contract test; the body contract is checked by `tests/mars/registry.test.ts`.
* The pipeline layout (deferred by decision).
* Screenshots: no headless browser was available; DOM snapshots, string inventories and download hashes
  stand in for them.
