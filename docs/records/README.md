# Records

Dated records of how the published data versions were built and validated, and of the checks made when
the code was restructured. They describe the state at the time of writing and are not updated afterwards;
the current behaviour is described in [`docs/guide/`](../guide/) and [`docs/reference/`](../reference/).
Working records of the development process (text audits, review rounds, status notes and one-off scripts)
are kept at the git tag `records-2026-10`.

| record | subject | data version |
|---|---|---|
| [validation-cells.md](validation-cells.md) | Earth cell store (`cells.zarr`): conversion and validation | `dune-atlas/v1/` |
| [validation-fields.md](validation-fields.md) | Earth map-field pyramids (GeoZarr) and the COG prototype | `dune-atlas/v1/fields/` |
| [validation-dunes.md](validation-dunes.md) | Earth dune map: polygons and PMTiles | `dune-atlas/v1/dunes/` |
| [validation-qsdiv.md](validation-qsdiv.md) | Earth flux divergence and the native-resolution aridity index | `dune-atlas/v1/` |
| [validation-veg.md](validation-veg.md) | Earth vegetation cover | `dune-atlas/v1/`, `v2/datasets/era5/` |
| [validation-era5.md](validation-era5.md) | Earth ERA5 0.25° wind dataset | `dune-atlas/v2/datasets/era5/` |
| [validation-mars-fields.md](validation-mars-fields.md) | Mars wind fields, cell store and sidecars (FV3 beta 1; §11: v2, fluxes of packed sand) | `dune-atlas/mars/v1/`, `mars/v2/datasets/fv3-beta1/` |
| [validation-mars-terrain.md](validation-mars-terrain.md) | Mars relief tiles, elevation and dune tiles | `dune-atlas/mars/v1/` |
| [validation-mars.md](validation-mars.md) | Mars atlas integration and first release | `dune-atlas/mars/v1/` |
| [refactor-baseline.md](refactor-baseline.md) | baseline of the 2026 code restructuring (builds, tests, snapshots) | — |
| [review-decisions-2026-10.md](review-decisions-2026-10.md) | outcome of every suggestion of the October 2026 user, learner and codebase reviews | — |
| [refactor-equivalence.md](refactor-equivalence.md) | equivalence checks of the restructuring into a shared core and per-planet folders (phases 2 and 3) | — |
