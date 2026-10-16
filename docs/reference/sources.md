# Data sources and licences

Every data product the atlas serves, where it comes from, its licence, and what the pipeline changed.
Structured attribution for third-party layers is also in the registry (`attribution: {source, citation, doi,
licence, url, changes}` on the layer, optional field of `registry/layers.schema.json`) and in each store's root
attrs, so the app can show it next to the layer.

| product (R2 key under `dune-atlas/v1/` unless a version is given) | source | licence | changes made by dune-atlas |
|---|---|---|---|
| `cells.zarr` (`hist`, `fields`, `land`, `dunes`) | Gunn, A. (2026) *The distribution of Earth's wind-blown sand dunes*, Nat Commun, doi:10.1038/s41467-026-75466-y; Supplementary Data, Zenodo, doi:10.5281/zenodo.20046812 (ERA5-Land 1950–2024 10 m wind histograms, qsat parameters) | CC BY 4.0 | uint32/float32 casts; DP/RDP/RDD/RDP-DP and qhbf/qhef computed from the histograms and qsat parameters (`qsat_view.py`); web layout |
| `fields/<23 qsat vars>.zarr` | as above | CC BY 4.0 | as `cells.zarr`; m²/s → m²/yr; ratios clipped ±6×10⁴; multiscale means; 12-bit mantissa rounding |
| `fields/qsdiv.zarr`, `cells-aux.zarr/qsdiv` | derived here from `rdpm`/`rdpa` following Gunn (2026), Methods M6 | CC BY 4.0 (as the inputs) | new quantity; m/yr; see `docs/records/validation-qsdiv.md` |
| `dunes/*.pmtiles` | dune map `dune-mask-rev1.tif`: Gunn, A. (2026) geomorphlab/dune-world Supplementary Code (v1.0.0), Zenodo, doi:10.5281/zenodo.20054674 | MIT | vectorised (8-connected), tiled |
| (all ERA5-Land-derived products, `v1/`) | ERA5-Land hourly reanalysis, Copernicus Climate Change Service, doi:10.24381/cds.e2161bac | CC BY 4.0 (the Climate Data Store licence since 2 July 2025), with the notice "Contains modified Copernicus Climate Change Service information (ERA5-Land, 1950–2024)" | via the Zenodo data above |
| `fields/aridity.zarr`, `cells-aux.zarr/ai_*` | **Global Aridity Index and Potential Evapotranspiration (ET0) Database v3.1** (Global-AI_PET v3.1), annual AI `ai_v31_yr.tif` (1970–2000, 30″). Paper: Zomer, R.J., Xu, J. & Trabucco, A. (2022) Version 3 of the Global Aridity Index and Potential Evapotranspiration Database. *Sci. Data* 9, 409, doi:10.1038/s41597-022-01493-1. Dataset: Zomer & Trabucco, Figshare, doi:10.6084/m9.figshare.7504448.v7 (v3.1 = Figshare version 7, published 2025-07-17; concept DOI 10.6084/m9.figshare.7504448) | CC BY 4.0 (Figshare record) — see note | integer AI×10⁴ → float32; ocean / ET0 = 0 → no data; 65535 kept as 6.5535 (AI ≥ 6.5535); multiscale means of valid pixels; 12-bit rounding (≤ 1.2×10⁻⁴ relative); per-0.1°-cell means |
| `fields/vegetation.zarr`, `cells-aux-veg.zarr` (`tot_cov_mean`, `tot_cov_n_months`) | **Fractional cover – MODIS, CSIRO Land and Water algorithm, Version 3.1.0** (CSIRO; MODIS MCD43A4 collection 6/6.1, monthly medoid, 500 m sinusoidal tiles), total vegetation cover `tot_cov` = PV + NPV, 2001–2025; the vegetation product of GEOGLAM Rangeland and Pasture Productivity (RAPP). Dataset: Guerschman, J. (2014) *Fractional cover – MODIS, CSIRO algorithm*, CSIRO, doi:10.4225/08/5848a3f19a7b3. Papers: Guerschman et al. (2015) *Remote Sens. Environ.* 161, 12–26, doi:10.1016/j.rse.2015.01.021; Guerschman & Hill (2018) *Remote Sens. Lett.* 9, 696–705, doi:10.1080/2150704X.2018.1465611. Distributed by NCI (project tc43; THREDDS https://thredds.nci.org.au/thredds/catalog/tc43/modis-fc/v310/tiles/monthly/cover/catalog.html); time series viewer: GEOGLAM RAPP Map https://map.geo-rapp.org/ | CC BY 4.0, Copyright 2008–2019 CSIRO | monthly 500 m tiles averaged to 0.1° (valid `tot_cov` ≤ 103 %) and over the 300 months 2001–2025 (months without valid data skipped); multiscale means of valid cells; 12-bit rounding (≤ 1.2×10⁻⁴ relative); see `docs/records/validation-veg.md` |
| `v2/datasets/era5/cells.zarr`, `v2/datasets/era5/fields/<23 vars>.zarr` (ERA5 dataset, 0.25°) | **ERA5** hourly 10 m u/v winds on single levels, 1950-01-01T00 – 2024-12-31T23 (657,456 h), 0.25°. Paper: Hersbach, H. et al. (2020) The ERA5 global reanalysis, Q. J. R. Meteorol. Soc. 146, 1999–2049, doi:10.1002/qj.3803. Data: Hersbach, H. et al. (2023) ERA5 hourly data on single levels from 1940 to present, Copernicus Climate Change Service (C3S) Climate Data Store (CDS), doi:10.24381/cds.adbb2d47; accessed via the NCI Australia replica (project rt52) | CC BY 4.0 (the Climate Data Store licence since 2 July 2025), with the notice "Contains modified Copernicus Climate Change Service information (ERA5, 1950–2024). Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data it contains.") | per-cell (speed, direction) histograms of the hourly winds and the 23 sand-flux fields × 64 thresholds computed by the atlas with the method of Gunn (2026) (`pipeline/gadi/era5/`, `qsat_compute.py`; docs/records/validation-era5.md); land cells = ERA5 land–sea mask fraction lsm > 0 (first build under `v1/datasets/era5/`: lsm > 0.5); display stores as for ERA5-Land |
| `v2/datasets/era5/fields/qsdiv.zarr`, `v2/datasets/era5/cells-aux.zarr` (`qsdiv`, `ai_*`, `lsm`) | ERA5 `rdpm`/`rdpa` above; ERA5 land–sea mask (invariant field `lsm`, same ERA5 record); Global-AI v3.1 (row below) | as the inputs | qsdiv as for ERA5-Land on the 0.25° grid (rdpm/rdpa limited to land cells); AI means of the 30″ pixels in each 0.25° footprint (900 nominal pixels); `lsm` copied per land cell |
| `v2/datasets/era5/cells-aux-veg.zarr` (`tot_cov_mean`, `tot_cov_valid_frac`) | the atlas 0.1° vegetation product (row below) | as that product | a regrid: exact spherical-area-weighted mean of the valid 0.1° cells over each 0.25° footprint, with the valid area fraction |
| `v2/datasets/era5/cells.zarr` `dunes` | dune map `dune-mask-rev1.tif` (row above) | MIT | 0.25° cell flagged when its footprint overlaps any 0.1° dune cell |
| `v2/datasets/merra2/` (`cells.zarr`, `fields/<23 vars>.zarr`, `fields/qsdiv.zarr`, `cells-aux.zarr`, `cells-aux-veg.zarr`) (MERRA-2 dataset, 0.5° × 0.625°) | **MERRA-2** inst1_2d_asm_Nx (M2I1NXASM v5.12.4) hourly instantaneous U10M/V10M, 1980-01-01T00 – 2025-12-31T23 (403,248 h), from NASA GES DISC (OPeNDAP subset). Paper: Gelaro, R. et al. (2017) *J. Climate* 30, 5419–5454, doi:10.1175/JCLI-D-16-0758.1; data: GMAO (2015) doi:10.5067/3Z173KIE2TPD. Land fraction FRLAND + FRLANDICE from const_2d_asm_Nx (M2C0NXASM), doi:10.5067/ME5QX6Q5IGGU | source: NASA Earth science data, no restrictions on use; atlas products **CC BY 4.0** | histograms and fields as for ERA5 (`pipeline/gadi/reanalysis/rean_hist.py`, same bins and fields code); land = land fraction > 0 (83,945 cells); aridity and vegetation on the 0.5° × 0.625° footprints; see `docs/records/validation-merra2-jra3q.md` |
| `v2/datasets/jra3q/` (same stores) (JRA-3Q dataset, 0.375°) | **JRA-3Q** fcst_surf ugrd10m/vgrd10m, 1-hour instantaneous forecasts, 1980-01-01T00 – 2025-12-31T23 (403,248 h), on the N240 Gaussian grid of NSF NCAR GDEX d640000. Paper: Kosaka, Y. et al. (2024) *J. Meteor. Soc. Japan* 102, 49–109, doi:10.2151/jmsj.2024-004; data: Japan Meteorological Agency (2023) doi:10.5065/AVTZ-1H78. Land fraction: TL479 land field (tl479_land) of the same record | **CC BY-NC-SA 4.0** (non-commercial, share-alike) for the source and the atlas products, with the notice "Contains JRA-3Q data of the Japan Meteorological Agency (1980–2025), for non-commercial use." | as MERRA-2; longitudes rolled to −180…179.625; land = land fraction > 0 (158,338 cells); rows drawn and indexed on the regular grid fitted through the Gaussian end rows (within 0.0051°), exact Gaussian latitudes in `grid.lat_values` and in every download; flux divergence on the exact latitudes |
| basemaps | OpenFreeMap/OpenMapTiles/OSM, Esri World Imagery, Mapterhorn, OpenTopoMap | providers' terms | none (attribution shown on the map) |

**Licence note (Global-AI v3.1) — needs the author's confirmation.** The Figshare record (API, 2026-10-13:
version 7, "Global Aridity Index and Potential Evapotranspiration (ET0) Database: Version 3.1") is licensed
**CC BY 4.0**. The readme shipped inside the download (`Global AI_ET0 v3.1 - Readme.docx`) still says the data are
"provided for non-commercial use" and that commercial use needs permission. The atlas is non-commercial, so both
readings allow it; the registry and store metadata state CC BY 4.0 (the repository licence of record) with the
citation the readme requests (Zomer, Xu & Trabucco 2022).

Version check: the local readme names v3.1 and the Figshare article URL (…/7504448) without a version suffix;
the suffix `.v7` was taken from the Figshare API (article 7504448 has versions 1–7; v5 = v3.0 cited in the 2022
paper, superseded by v3.1, which revises the net-longwave radiation term as the readme describes).

## Recommended citations (as shown in the app)
- Atlas data: Gunn (2026) Nat Commun doi:10.1038/s41467-026-75466-y; data doi:10.5281/zenodo.20046812.
- ERA5 dataset: Hersbach, H. et al. (2020) Q. J. R. Meteorol. Soc. 146, 1999–2049, doi:10.1002/qj.3803; data:
  Hersbach, H. et al. (2023) ERA5 hourly data on single levels from 1940 to present, C3S CDS,
  doi:10.24381/cds.adbb2d47; fields computed with the method of Gunn (2026); Copernicus notice as above with "ERA5".
- Aridity: Zomer, R.J., Xu, J. & Trabucco, A. (2022) Sci. Data 9, 409, doi:10.1038/s41597-022-01493-1; data:
  Global-AI_PET v3.1, doi:10.6084/m9.figshare.7504448.v7 (CC BY 4.0). Resampled/derived by dune-atlas.
  Shown in the aridity layer's info popover (registry `attribution`), in About → Data sources, and in the
  references of every per-cell download (NetCDF `references`, metadata.json, README, citation TXT).
- Flux divergence: computed by the atlas from RDP/RDD following Gunn (2026), Methods M6; cite the paper and
  the Supplementary Data.
- Vegetation cover: Guerschman, J.P. et al. (2015) Remote Sens. Environ. 161, 12–26,
  doi:10.1016/j.rse.2015.01.021; Guerschman, J.P. & Hill, M.J. (2018) Remote Sens. Lett. 9, 696–705,
  doi:10.1080/2150704X.2018.1465611; data: Guerschman, J. (2014) Fractional cover – MODIS, CSIRO algorithm,
  Version 3.1.0, CSIRO, doi:10.4225/08/5848a3f19a7b3 (CC BY 4.0, Copyright 2008–2019 CSIRO), distributed by
  NCI. GEOGLAM RAPP Map (full monthly time series): https://map.geo-rapp.org/. Averaged to 0.1° and over
  2001–2025 by dune-atlas. The CC BY 4.0 notice requires the creator (CSIRO Land and Water), the copyright
  notice, the licence, a link to the data and an indication of changes; all five are in the registry
  `attribution` and in the store root attrs. The product metadata also asks users to send citations of
  publications that use the data to the data custodian (contact in the NetCDF global attributes).

## Per-cell sidecars (convention for new per-cell variables)
`cells.zarr` and `cells-aux.zarr` are immutable once published. Each later group of per-cell variables is a
separate store `dune-atlas/<version>/cells-aux-<name>.zarr` on the same 1801 × 3600 grid with the
`cells-aux.zarr` layout (`pipeline/src/dune_atlas_pipeline/cellsaux.py`): scalar arrays (latitude, longitude)
float32 in plain 64 × 64 chunks; threshold-dependent arrays (latitude, longitude, ut) sharded 16 × 16 cells
with a one-cell inner chunk and the index at the end; values only on `cells.zarr` land cells; all-ocean chunks
absent; root attrs `variables`, `grid`, `sidecar_of`, `attribution`. Current sidecars: `cells-aux-veg.zarr`
(`tot_cov_mean` %, `tot_cov_n_months`). A later data version may consolidate the sidecars into one store.
