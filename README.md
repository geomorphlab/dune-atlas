# Dune Atlas

An interactive atlas of wind-blown sand dunes, wind regimes and sand-flux fields for Earth and Mars,
from the Geomorphology Lab, Monash University.

[Earth atlas](https://map.geomorphlab.org/) · [Mars atlas](https://map.geomorphlab.org/mars/) ·
[Data](https://data.geomorphlab.org/) · [How to cite](#how-to-cite) · [Licences](#data-and-licences)

## What it shows

- **Earth**: the global dune map of Gunn (2026); per-cell wind regimes from ERA5-Land (0.1°) and ERA5
  (0.25°) hourly 10 m winds, 1950–2024; 23 sand-flux quantities (drift potentials, resultant drift
  direction, dune-orientation modes, crest fluxes and their ratios) at 64 threshold friction velocities;
  flux divergence; aridity index and vegetation cover.
- **Mars**: dune fields from the USGS Mars Global Digital Dune Database and Fenton (2020); hourly winds,
  temperature and air density of one Mars year from the MCMC FV3 Mars GCM (beta release 1, 2°); sand
  flux from the transport law of Pähtz & Durán (2023) at 64 median grain diameters; MOLA–HRSC relief.
- **Cell panel** (click any cell): wind and sand-flux roses, dune-orientation modes, a summary table, and
  downloads of the cell's data (NetCDF, CSV bundle) with citation text.
- **Share and export**: short links to any view; map and plot images with colour bars, scale and sources.
- **Search and Concepts**: go to typed coordinates; the Concepts panel explains the quantities, with
  references.
- **Bulk data**: every cell of a latitude-longitude box as one NetCDF file (Download a region), and the
  public Zarr stores for whole grids (Get the whole grid, under Download & cite).

## How to cite

Please cite the paper (preferred citation; also in [`CITATION.cff`](CITATION.cff)):

> Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. *Nature Communications*.
> https://doi.org/10.1038/s41467-026-75466-y

```bibtex
@article{gunn2026dunes,
  author  = {Gunn, Andrew},
  title   = {The distribution of {Earth}'s wind-blown sand dunes},
  journal = {Nature Communications},
  year    = {2026},
  doi     = {10.1038/s41467-026-75466-y}
}
```

Cite the data you use as well: the atlas's Earth wind histograms and sand-flux fields are the
Supplementary Data of the paper (Gunn 2026, Zenodo, https://doi.org/10.5281/zenodo.20046812); every other
source (ERA5, ERA5-Land, aridity, vegetation, the Mars GCM, dune databases and DEM) is listed with its
citation in each layer's information, in the downloads of every cell, and in
[`docs/reference/sources.md`](docs/reference/sources.md).

## Data access

All data are static, range-readable files on `https://data.geomorphlab.org/` (HTTP range requests and
CORS enabled), so they can be read directly by any zarr v3 or PMTiles client:

| atlas | prefix | contents |
|---|---|---|
| Earth, ERA5-Land 0.1° | `dune-atlas/v1/` | `cells.zarr` (per-cell wind histograms and fields at 64 thresholds), `cells-aux*.zarr` (flux divergence, aridity, vegetation), `fields/<field>.zarr` (map pyramids), `dunes/*.pmtiles` |
| Earth, ERA5 0.25° | `dune-atlas/v2/datasets/era5/` | the same stores on the 0.25° grid |
| Mars, MCMC FV3 2° | `dune-atlas/mars/v2/datasets/fv3-beta1/` | `cells.zarr` (hourly series and fields at 64 grain diameters), `cells-aux.zarr`, `fields/<field>.zarr` |
| Mars, other | `dune-atlas/mars/v1/` | `dunes/*.pmtiles`, `fields/elevation.zarr`, `basemaps/hrsc-mola-terrarium.pmtiles` |

Published objects are never overwritten: a new data version gets a new prefix. The store layout is
described in [`docs/reference/storage-layout.md`](docs/reference/storage-layout.md). For one cell, the
cell panel's downloads are the simplest route to the data.

## Data and licences

The code is released under the MIT licence ([`LICENSE`](LICENSE)). The data products carry the licences of
their sources, which differ between products (for example CC BY 4.0 for the Earth ERA5 and ERA5-Land products and
CC BY-SA 3.0 IGO for the Mars relief tiles); see the per-product table in
[`DATA_LICENSE.md`](DATA_LICENSE.md). Basemap tiles are subject to their providers' terms.

This page was created with assistance from Claude AI. I have reviewed the functionality and underlying
data but if you notice any issues or errors please contact me at a.gunn@monash.edu.

## Run locally

Prerequisites: Node 22 (and Python 3.11 or later for the data pipeline).

```bash
cd app
npm ci
npm run dev          # Earth atlas at http://localhost:5173/, reading the published data
npm run dev:mars     # Mars atlas (VITE_BODY=mars)
npm test             # Earth tests;  npm run test:mars  for Mars
npm run build        # static site in app/dist/;  npm run build:mars  for app/dist-mars/
```

To work offline or on new data, build a small local fixture and serve it with HTTP range support; see
[`docs/guide/getting-started.md`](docs/guide/getting-started.md).

## How the data are produced

Source data (the paper's wind histograms and sand-flux fields, reanalysis winds, the Mars GCM output, dune
maps, DEMs) are converted by the Python package in `pipeline/` into web-optimised stores: sharded zarr v3
cell stores, GeoZarr map pyramids and PMTiles. Large builds run on an HPC system (`pipeline/gadi/`). The
stores are uploaded once to the data bucket, and the pipeline writes the matching registry entries
(`registry/`), from which the app builds its layer list. See
[`docs/guide/architecture.md`](docs/guide/architecture.md) and the build and validation records in
[`docs/records/`](docs/records/).

## Repository layout

| path | contents |
|---|---|
| `app/` | the web app: TypeScript, Vite, MapLibre GL JS; one code base for both atlases (`app/src/core/` shared, `app/src/bodies/earth/` and `app/src/bodies/mars/` per planet) |
| `pipeline/` | Python package `dune_atlas_pipeline` (data conversion) and the HPC jobs |
| `registry/` | layer, basemap and dataset registry per planet (`registry/earth/`, `registry/mars/`; YAML, validated against `registry/layers.schema.json`) |
| `scripts/` | build, upload and verification scripts |
| `tools/checks/` | equivalence checks used when refactoring (build hashes, snapshots, share links) |
| `docs/` | `guide/` (how to develop and extend), `reference/` (sources, physics, storage), `records/` (dated build and validation records) |

## Extending the atlas

- Add a map layer: [`docs/guide/adding-a-layer.md`](docs/guide/adding-a-layer.md)
- Add a wind dataset or a planet: [`docs/guide/extending.md`](docs/guide/extending.md)

## Testing and continuous integration

Every pull request and push runs the app tests of both atlases, the registry validation, the type check,
both builds and the pipeline tests (on synthetic data) in GitHub Actions (`.github/workflows/ci.yml`).
The site is deployed to GitHub Pages from `main` only after these checks pass (the `deploy` job of
the same workflow). Changes reach `main` through pull requests; see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Contact

Andrew Gunn, Geomorphology Lab, Monash University — a.gunn@monash.edu — https://geomorphlab.org/
