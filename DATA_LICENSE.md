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
| Wind histograms and the 23 sand-flux fields, ERA5-Land 0.1° (cell store and map fields) | `v1/cells.zarr` (`hist`, `fields`), `v1/fields/<field>.zarr` | Gunn, A. (2026) *The distribution of Earth's wind-blown sand dunes – Supplementary Data*, Zenodo, doi:10.5281/zenodo.20046812 (CC BY 4.0), computed from ERA5-Land hourly winds (C3S, doi:10.24381/cds.e2161bac) | **CC BY 4.0**. Notice: "Contains modified Copernicus Climate Change Service information." |
| Flux divergence, ERA5-Land | `v1/fields/qsdiv.zarr`, `v1/cells-aux.zarr` (`qsdiv`) | the ERA5-Land fields above, following Gunn (2026), Methods | **CC BY 4.0** |
| Wind histograms, sand-flux fields and flux divergence, ERA5 0.25° | `v2/datasets/era5/` (`cells.zarr`, `fields/`, `cells-aux.zarr` `qsdiv`, `lsm`) | ERA5 hourly 10 m winds and land–sea mask (C3S, doi:10.24381/cds.adbb2d47; Hersbach et al. 2020), computed by the atlas with the methods of Gunn (2026) | **The ERA5 licence.** The atlas states the *Licence to use Copernicus Products* with the notice "Contains modified Copernicus Climate Change Service information (ERA5, 1950–2024). Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data it contains." See note 1. |
| Dune map (vector tiles and per-cell dune flags) | `v1/dunes/*.pmtiles`, `cells.zarr` `dunes` (both datasets) | dune map `dune-mask-rev1.tif` in Gunn, A. (2026) *geomorphlab/dune-world – Supplementary Code* v1.0.0, Zenodo, doi:10.5281/zenodo.20054674 (MIT) | **MIT** (as the source record). See note 2. |
| Aridity index | `v1/fields/aridity.zarr`, `cells-aux.zarr` `ai_*` (both datasets) | Global Aridity Index and Potential Evapotranspiration Database v3.1, Zomer & Trabucco, Figshare, doi:10.6084/m9.figshare.7504448.v7; Zomer, Xu & Trabucco (2022) *Sci. Data* 9, 409 | **CC BY 4.0** (licence of the Figshare record). See note 3. |
| Vegetation cover | `v1/fields/vegetation.zarr`, `v1/cells-aux-veg.zarr`, `v2/datasets/era5/cells-aux-veg.zarr` | Fractional cover – MODIS, CSIRO Land and Water algorithm, v3.1.0, Guerschman (2014), CSIRO, doi:10.4225/08/5848a3f19a7b3, distributed by NCI | **CC BY 4.0**, © 2008–2019 CSIRO |

## Mars atlas

| product | location (under `dune-atlas/mars/`) | derived from | licence of the product |
|---|---|---|---|
| Hourly wind series, sand-flux fields, flux divergence and air density, MCMC FV3 2° | `v2/datasets/fv3-beta1/` (`cells.zarr`, `fields/`, `cells-aux.zarr` `qsdiv`, `rho_mean`); the superseded first build under `v1/datasets/fv3-beta1/` was deleted on 14 October 2026 | NASA Ames Mars Climate Modeling Center, FV3-based Mars GCM Beta Output Release 1 (`fv3betaout1`), transport law of Pähtz & Durán (2023) | **No licence stated by the source** (NASA open data); the atlas states "NASA Ames MCMC output; no licence stated (NASA open data)". |
| Relief basemap tiles (MOLA–HRSC hillshade, terrarium encoding) | `v1/basemaps/hrsc-mola-terrarium.pmtiles` | Mars MGS MOLA – MEX HRSC Blended DEM Global 200m v2 (Fergason, Hare & Laura 2018, USGS Astrogeology): MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO) | **CC BY-SA 3.0 IGO** (share-alike, as an adaptation of the HRSC data) |
| Elevation (map field and per-cell mean) | `v1/fields/elevation.zarr`, `v2/datasets/fv3-beta1/cells-aux.zarr` `elev_mean` | the same blended DEM | **CC BY-SA 3.0 IGO** (share-alike, as an adaptation of the HRSC data). See note 4. |
| Dune polygons (vector tiles, surface-without-dunes tiles, per-cell dune fraction) | `v1/dunes/dunes-r2.pmtiles`, `v1/dunes/invert-r2.pmtiles`, `cells.zarr` `dunes` | USGS Mars Global Digital Dune Database (MGD3; Hayward et al. 2007, 2010, 2012, 2014; public domain) merged with the small dune fields of Fenton (2020, *Icarus* 352, 114018) | MGD3 part: **public domain** (U.S. Geological Survey). Fenton (2020) part: **no licence stated** by the source. See note 5. |

## Basemaps

Basemap tiles that the atlas does not host (OpenFreeMap/OpenMapTiles/OpenStreetMap, Esri World Imagery,
Mapterhorn, OpenTopoMap, OpenPlanetaryMap, Esri OnMars) are subject to their providers' terms; each is
credited on the map and in the layer list.

## Notes

1. **ERA5 and ERA5-Land.** Since 2 July 2025 the Copernicus Climate Data Store distributes ERA5 and
   ERA5-Land under CC BY 4.0, replacing the *Licence to use Copernicus Products*. The atlas text (layer
   information, downloads) still names the earlier licence for the ERA5 0.25° products; whether to
   restate them as CC BY 4.0 is the author's decision and needs a text change in the app.
2. **Dune map.** The map attribution of the atlas reads "Dune map: Gunn (2026), CC BY 4.0", while the
   per-cell references give the source record's licence (MIT). The source record (Zenodo
   doi:10.5281/zenodo.20054674) is MIT-licensed.
3. **Aridity.** The Figshare record is CC BY 4.0; the readme shipped with the download still describes
   the data as provided for non-commercial use. The atlas is non-commercial, so both readings allow it.
4. **Elevation.** The layer information in the atlas lists the source licences ("CC0 (MOLA), CC BY-SA
   3.0 IGO (HRSC)"); the derived stores themselves are share-alike.
5. **Mars dune polygons.** The layer information in the atlas gives "Public domain (U.S. Geological
   Survey)" for the merged layer; this holds for the MGD3 polygons only. Fenton (2020) published the new
   dune fields with the paper (data shared by the author); no licence is stated for them.
