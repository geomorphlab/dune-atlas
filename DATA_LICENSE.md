# Data licences

The **code** in this repository is MIT-licensed (see `LICENSE`). The **data products** served by the
atlas at `https://data.geomorphlab.org/` have different licences, set by the sources they are derived
from. The table below gives each product, its location in the data bucket, its source and the
licence that applies to it. There is no blanket licence for all derived stores.

Source details, citations and the processing steps of every product are in
[`docs/reference/sources.md`](docs/reference/sources.md); each store also carries its attribution in its
root attributes, and every per-cell download lists its sources and licences.

## Earth atlas

| product | location (under `dune-atlas/`) | derived from | licence of the product |
|---|---|---|---|
| Wind histograms and the 23 sand-flux fields, ERA5-Land 0.1° (cell store and map fields) | `v1/cells.zarr` (`hist`, `fields`), `v1/fields/<field>.zarr` | Gunn, A. (2026) *The distribution of Earth's wind-blown sand dunes – Supplementary Data*, Zenodo, doi:10.5281/zenodo.20046812 (CC BY 4.0), computed from ERA5-Land hourly winds (C3S, doi:10.24381/cds.e2161bac; CC BY 4.0) | **CC BY 4.0**. Notice: "Contains modified Copernicus Climate Change Service information." |
| Flux divergence, ERA5-Land | `v1/fields/qsdiv.zarr`, `v1/cells-aux.zarr` (`qsdiv`) | the ERA5-Land fields above, following Gunn (2026), Methods | **CC BY 4.0** |
| Wind histograms, sand-flux fields and flux divergence, ERA5 0.25° | `v2/datasets/era5/` (`cells.zarr`, `fields/`, `cells-aux.zarr` `qsdiv`, `lsm`) | ERA5 hourly 10 m winds and land–sea mask (C3S, doi:10.24381/cds.adbb2d47; Hersbach et al. 2020), computed by the atlas with the methods of Gunn (2026) | **CC BY 4.0** (the ERA5 licence since 2 July 2025), with the notice "Contains modified Copernicus Climate Change Service information (ERA5, 1950–2024). Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data it contains." See note 1. |
| Wind histograms, sand-flux fields and flux divergence, MERRA-2 0.5° × 0.625° | `v2/datasets/merra2/` (`cells.zarr`, `fields/`, `cells-aux.zarr` `qsdiv`, `lsm`) | MERRA-2 hourly 10 m winds (GMAO 2015, inst1_2d_asm_Nx, doi:10.5067/3Z173KIE2TPD; Gelaro et al. 2017) and land fraction (const_2d_asm_Nx, doi:10.5067/ME5QX6Q5IGGU), NASA GES DISC, computed by the atlas with the methods of Gunn (2026) | **CC BY 4.0**. The source data are NASA Earth science data without restrictions on use. See note 8. |
| Wind histograms, sand-flux fields and flux divergence, JRA-3Q 0.375° | `v2/datasets/jra3q/` (`cells.zarr`, `fields/`, `cells-aux.zarr` `qsdiv`, `lsm`) | JRA-3Q hourly 10 m winds and land fraction (Japan Meteorological Agency 2023, NSF NCAR GDEX d640000, doi:10.5065/AVTZ-1H78; Kosaka et al. 2024), computed by the atlas with the methods of Gunn (2026) | **CC BY-NC-SA 4.0** (non-commercial, share-alike, as the source), with the notice "Contains JRA-3Q data of the Japan Meteorological Agency (1980–2025), for non-commercial use." See note 9. |
| Dune map (vector tiles and per-cell dune flags) | `v1/dunes/*.pmtiles`, `cells.zarr` `dunes` (every Earth wind dataset) | dune map `dune-mask-rev1.tif` in Gunn, A. (2026) *geomorphlab/dune-world – Supplementary Code* v1.0.0, Zenodo, doi:10.5281/zenodo.20054674 (MIT) | **MIT** (as the source record). See note 2. |
| Aridity index | `v1/fields/aridity.zarr`, `cells-aux.zarr` `ai_*` (every Earth wind dataset) | Global Aridity Index and Potential Evapotranspiration Database v3.1, Zomer & Trabucco, Figshare, doi:10.6084/m9.figshare.7504448.v7; Zomer, Xu & Trabucco (2022) *Sci. Data* 9, 409 | **CC BY 4.0** (licence of the Figshare record). See note 3. |
| Vegetation cover | `v1/fields/vegetation.zarr`, `v1/cells-aux-veg.zarr`, `v2/datasets/{era5,merra2,jra3q}/cells-aux-veg.zarr` | Fractional cover – MODIS, CSIRO Land and Water algorithm, v3.1.0, Guerschman (2014), CSIRO, doi:10.4225/08/5848a3f19a7b3, distributed by NCI | **CC BY 4.0**, © 2008–2019 CSIRO |

## Mars atlas

| product | location (under `dune-atlas/mars/`) | derived from | licence of the product |
|---|---|---|---|
| Hourly wind series, sand-flux fields, flux divergence and air density, MCMC FV3 2° | `v2/datasets/fv3-beta1/` (`cells.zarr`, `fields/`, `cells-aux.zarr` `qsdiv`, `rho_mean`); the superseded first build under `v1/datasets/fv3-beta1/` was deleted on 14 October 2026 | NASA Ames Mars Climate Modeling Center, FV3-based Mars GCM Beta Output Release 1 (`fv3betaout1`, doi:10.25966/rjgg-r639), transport law of Pähtz & Durán (2023) | **No licence stated by the source** (NASA open data); the atlas states "NASA Ames MCMC output; no licence stated (NASA open data)". |
| Hourly wind series, sand-flux fields, flux divergence and air density, EMARS v1.0 Mars Year 30 (6° × 5.14°) | `v2/datasets/emars-v1-my30/` (`cells.zarr`, `fields/`, `cells-aux.zarr`) | EMARS v1.0 reanalysis (Greybush et al. 2018, Penn State Data Commons, doi:10.18113/D3W375), read from ARCO-EMARS (Bhattacharya 2026, doi:10.57967/hf/8859); transport law of Pähtz & Durán (2023) | **CC BY 4.0** as labelled by ARCO-EMARS; the licence of the original Penn State record is to be confirmed. See note 6. |
| Two-hourly wind series, sand-flux fields, flux divergence and air density, MACDA v2.0 Mars Year 30 (5°) | `v2/datasets/macda-v2-my30/` (`cells.zarr`, `fields/`, `cells-aux.zarr`) | MACDA v2.0 reanalysis (Valeanu et al. 2026, NERC EDS Centre for Environmental Data Analysis, doi:10.5285/cd037a9ea387438fabf4d674dbe53088), read from ARCO-MACDA (Bhattacharya 2026, doi:10.57967/hf/8771); transport law of Pähtz & Durán (2023) | **UK Open Government Licence v3.0** (the CEDA record), with the notice "Contains public sector information licensed under the Open Government Licence v3.0". See note 7. |
| Relief basemap tiles (MOLA–HRSC hillshade, terrarium encoding) | `v1/basemaps/hrsc-mola-terrarium.pmtiles` | Mars MGS MOLA – MEX HRSC Blended DEM Global 200m v2 (Fergason, Hare & Laura 2018, USGS Astrogeology): MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO) | **CC BY-SA 3.0 IGO** (share-alike, as an adaptation of the HRSC data) |
| Elevation (map field and per-cell mean) | `v1/fields/elevation.zarr`, `v2/datasets/fv3-beta1/cells-aux.zarr` `elev_mean` | the same blended DEM | **CC BY-SA 3.0 IGO** (share-alike, as an adaptation of the HRSC data). See note 4. |
| Dune polygons (vector tiles, surface-without-dunes tiles, per-cell dune fraction) | `v1/dunes/dunes-r2.pmtiles`, `v1/dunes/invert-r2.pmtiles`, `cells.zarr` `dunes` | USGS Mars Global Digital Dune Database (MGD3; Hayward et al. 2007, 2010, 2012, 2014; public domain) merged with the small dune fields of Fenton (2020, *Icarus* 352, 114018) | MGD3 polygons: **public domain** (U.S. Geological Survey). Fenton (2020) dune fields: **CC BY 4.0** (granted by the author; cite Fenton 2020). See note 5. |

## Basemaps

Basemap tiles that the atlas does not host (OpenFreeMap/OpenMapTiles/OpenStreetMap, Esri World Imagery,
Mapterhorn, OpenTopoMap, OpenPlanetaryMap, Esri OnMars) are subject to their providers' terms; each is
credited on the map and in the layer list.

## Notes

The decisions below were taken by the author in October 2026.

1. **ERA5 and ERA5-Land.** Since 2 July 2025 the Copernicus Climate Data Store distributes ERA5 and
   ERA5-Land under CC BY 4.0 (the catalogue pages of both datasets list CC-BY-4.0), replacing the
   *Licence to use Copernicus Products*. The atlas states CC BY 4.0 for both datasets and for the
   products computed from them, with the Copernicus Climate Change Service attribution ("Contains
   modified Copernicus Climate Change Service information …") and the dataset DOIs (ERA5
   doi:10.24381/cds.adbb2d47, ERA5-Land doi:10.24381/cds.e2161bac): in the registry entries of the
   datasets, the layer information, About, the downloads (NetCDF attributes and READMEs), the image
   export credit lines and the citation entries. The stores already on the data server are not rewritten
   (they are write-once): the ERA5 0.25° land–sea mask (`v2/datasets/era5/cells-aux.zarr` `lsm`) still
   carries the attribute "Copernicus licence (Licence to use Copernicus products)", as does the
   `dataset` attribute of `v2/datasets/era5/cells.zarr`. The atlas does not show or export these
   attributes; the licence that applies is CC BY 4.0.
2. **Dune map.** The dune map has the licence of its source record, the Supplementary Code record (Zenodo
   doi:10.5281/zenodo.20054674, MIT). The map attribution reads "Dune map: Gunn (2026), MIT", as do
   the per-cell references, About and the image export credit line.
3. **Aridity.** No change: the licence of the Figshare record (CC BY 4.0) governs. The readme shipped
   with the download still describes the data as provided for non-commercial use.
4. **Elevation.** The derived elevation products (map field, per-cell mean) and the relief basemap
   tiles are CC BY-SA 3.0 IGO, as adaptations of the HRSC data. The layer information of the elevation
   layer and of the relief basemap lists the source licences ("CC0 (MOLA), CC BY-SA 3.0 IGO (HRSC)")
   followed by "Derived elevation and relief tiles: CC BY-SA 3.0 IGO."; per-cell downloads state the
   same.
5. **Mars dune polygons.** "Public domain (U.S. Geological Survey)" applies to the MGD3 polygons only;
   the atlas states it as "MGD3 polygons: public domain (U.S. Geological Survey)". The small dune fields
   of Fenton (2020, *Icarus* 352, 114018; data shared by the author) are **CC BY 4.0**: the author, L. K. Fenton,
   agreed by email (October 2026) to their use under CC BY 4.0, provided Fenton (2020) is cited.
   The original data are the paper's supplementary archive, posted by the author on ResearchGate:
   https://www.researchgate.net/publication/344520812_fenton2020_101016jicarus2020114018_SupplementaryMaterialstargz.
   The atlas states "MGD3 polygons: public domain (U.S. Geological Survey); Fenton (2020) dune fields: CC BY 4.0".
6. **EMARS.** The atlas reads EMARS v1.0 from ARCO-EMARS, an analysis-ready copy on Hugging Face labelled CC BY 4.0.
   The licence of the original record (Penn State Data Commons, doi:10.18113/D3W375) has not yet been confirmed with
   its authors; until it is, the atlas states "CC BY 4.0 as labelled by ARCO-EMARS" and cites both the original record
   and the copy.
7. **MACDA.** The CEDA record of MACDA v2.0 is licensed under the UK Open Government Licence v3.0 (permitted use: any),
   with the condition that the data are cited as the record states; ARCO-MACDA is labelled CC BY 4.0. The atlas states
   the OGL with its notice, cites the record (Valeanu et al. 2026) and the copy, and links the CEDA record.
8. **MERRA-2.** NASA Earth science data carry no restrictions on use; GMAO asks that the collection DOIs and
   Gelaro et al. (2017) be cited. The wind histograms, sand-flux fields and flux divergence computed by the atlas
   from MERRA-2 are **CC BY 4.0**, like the ERA5 products. The land fraction `lsm` is FRLAND + FRLANDICE of the
   constants collection M2C0NXASM (doi:10.5067/ME5QX6Q5IGGU).
9. **JRA-3Q.** JRA-3Q is distributed by its cooperative organisations (here NSF NCAR GDEX, d640000) for
   non-commercial use under CC BY-NC-SA 4.0. The atlas products computed from it are therefore **CC BY-NC-SA 4.0**
   (non-commercial, share-alike), and every JRA-3Q store, layer, download and citation entry states this licence and
   the notice "Contains JRA-3Q data of the Japan Meteorological Agency (1980–2025), for non-commercial use." The data
   citation year is 2023 (the publication date of the GDEX record, doi:10.5065/AVTZ-1H78); `cells.zarr` was built on
   Gadi with 2022 and corrected in its root attributes before upload.
