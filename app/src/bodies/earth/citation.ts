// Earth citations besides the datasets' (registry datasets[].credits / citationSources): the atlas and
// dune-map source, the per-cell and layer sources, the map attribution and the credit lines of image
// exports. Formatting and the dataset credits: core/cell/citation.ts.
import { escapeHtml } from "../../core/util/format";
import { datasetCredits, datasetInfo } from "../../core/cell/datasetinfo";
import type { CitationSource } from "../../core/cell/citation";
import { PAPER_DOI } from "../../core/cell/paper";

/** Map attribution line of the dune map and the wind-regime fields, following the selected dataset: the dune
 *  map has the licence of its source record (Supplementary Code, MIT); fields from the paper's data record
 *  (ERA5-Land) are Gunn (2026) data, CC BY 4.0; fields computed for the atlas (ERA5) carry the dataset's
 *  field licence (registry credits.fieldsLicence). */
export function mapAttributionHtml(datasetId: string): string {
  const d = datasetInfo(datasetId), licence = datasetCredits(datasetId).fieldsLicence, paper = `<a href="https://doi.org/${PAPER_DOI}" target="_blank" rel="noopener">Gunn (2026)</a>`;
  return d.fieldsFrom === "paper"
    ? `Dune map: ${paper}, MIT; wind-regime data: ${paper}, CC BY 4.0`
    : `Dune map: ${paper}, MIT; wind-regime fields computed for the atlas from ${escapeHtml(d.name)} ${escapeHtml(d.resolution)} with the methods outlined in ${paper}, ${escapeHtml(licence)}`;
}

/** Supplementary Data record (CC BY 4.0): wind histograms and qsat parameter fields */
export const DATA_DOI = "10.5281/zenodo.20046812";
/** Supplementary Code record (v1.0.0, MIT), which contains the dune map (dune-mask-rev1.tif) */
export const DUNE_MAP_DOI = "10.5281/zenodo.20054674";
/** label of that entry: the record's Zenodo title is kept, the label says it is the dune map */
export const DUNE_MAP_LABEL = "Data (dune map: dune-mask-rev1.tif, contained in the Supplementary Code record)";


/** The body's sources (the datasets' are in the registry). Only those a dataset cites (plus ids requested via
 *  citationSources(extra)) are cited; 'aridity' is the hook for the aridity-index layer (add its
 *  id to the layer's citation list / DEFAULT_SOURCE_IDS when that layer lands). */
export const BODY_CITATION_SOURCES: Record<string, CitationSource> = {
  "dune-atlas": {
    id: "dune-atlas", title: "Dune Atlas / dune map",
    entries: [
      { label: "Paper", text: "Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications.", doi: PAPER_DOI },
      // Supplementary Data record: the wind histograms and qsat parameter fields
      { label: "Data (wind histograms and sand-flux fields)", text: "Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes - Supplementary Data. Zenodo.", doi: DATA_DOI, license: "CC BY 4.0" },
      // Supplementary Code record: contains the dune map (dune-mask-rev1.tif)
      { label: DUNE_MAP_LABEL, text: "Gunn, A. (2026). geomorphlab/dune-world: The distribution of Earth's wind-blown sand dunes - Supplementary Code (v1.0.0). Zenodo.", doi: DUNE_MAP_DOI, license: "MIT", key: "data_dune_map" },
    ],
  },
  aridity: {
    id: "aridity", title: "Global Aridity Index (Global-AI_PET v3.1)",
    entries: [
      { label: "Paper", text: "Zomer, R. J., Xu, J. & Trabucco, A. (2022). Version 3 of the Global Aridity Index and Potential Evapotranspiration Database. Scientific Data 9, 409.", doi: "10.1038/s41597-022-01493-1" },
      { label: "Data", text: "Zomer, R. J. & Trabucco, A. Global Aridity Index and Potential Evapotranspiration (ET0) Database: Version 3.1 (Global-AI_PET v3.1). Figshare.", doi: "10.6084/m9.figshare.7504448.v7", license: "CC BY 4.0" },
    ],
  },
  vegetation: {
    id: "vegetation", title: "Vegetation cover (CSIRO MODIS Fractional Cover v3.1)",
    entries: [
      { label: "Paper", text: "Guerschman, J. P. et al. (2015). Assessing the effects of site heterogeneity and soil properties when unmixing photosynthetic vegetation, non-photosynthetic vegetation and bare soil fractions from Landsat and MODIS data. Remote Sensing of Environment 161, 12–26.", doi: "10.1016/j.rse.2015.01.021" },
      { label: "Paper", text: "Guerschman, J. P. & Hill, M. J. (2018). Calibration and validation of the Australian fractional cover product for MODIS collection 6. Remote Sensing Letters 9, 696–705.", doi: "10.1080/2150704X.2018.1465611" },
      { label: "Data", text: "Guerschman, J. (2014). Fractional cover - MODIS, CSIRO algorithm (v3.1). CSIRO; hosted by NCI.", doi: "10.4225/08/5848a3f19a7b3", license: "CC BY 4.0, © 2008–2019 CSIRO" },
    ],
    notice: "Full monthly time series: GEOGLAM RAPP Map, https://map.geo-rapp.org/",
  },
};
/** sources of a cell download (the cells-aux sidecars carry the aridity and vegetation cell means) */
export const CELL_SOURCE_IDS = ["aridity", "vegetation"];
/** the per-cell dune flag of the downloads: its name and the licence of the dune map it comes from (DATA_LICENSE.md) */
export const DUNE_FLAG_LONG_NAME = "cell mapped as containing wind-blown sand dunes";
/** global attribute transport_law of the region downloads (Earth: none; the method is in fields_citation) */
export const TRANSPORT_LAW_ATTR: string = "";
export const DUNE_FLAG_LICENCE = "MIT (dune map of Gunn 2026, in the Supplementary Code record doi:10.5281/zenodo.20054674)";


/** image exports: the data line of a plot (the wind line appended) */
export const plotDataCredit = (windText: string) => `Data: Gunn, A. (2026) The distribution of Earth's wind-blown sand dunes. Nature Communications, doi:${PAPER_DOI}. ${windText}`;
/** map exports: the dune-map line */
export const MAP_DUNE_CREDIT = `Dune map: Gunn, A. (2026) The distribution of Earth's wind-blown sand dunes. Nature Communications, doi:${PAPER_DOI}; data doi:${DUNE_MAP_DOI}, MIT; wind-regime fields with the methods outlined there.`;
/** map exports: the credit line of an external layer, written when that layer is visible (in this order) */
export const MAP_LAYER_CREDITS: Record<string, string> = {
  aridity: "Aridity: Global Aridity Index v3.1 (Zomer, Xu & Trabucco 2022, doi:10.1038/s41597-022-01493-1; data doi:10.6084/m9.figshare.7504448.v7), CC BY 4.0.",
  vegetation: "Vegetation cover: CSIRO MODIS Fractional Cover v3.1 (Guerschman et al. 2015, doi:10.1016/j.rse.2015.01.021; data doi:10.4225/08/5848a3f19a7b3), CC BY 4.0, © 2008–2019 CSIRO.",
};
/** About, Citation: the body's sources listed besides the datasets' (cell/citation.ts aboutSourceIds) */
export const ABOUT_SOURCE_IDS = ["aridity", "vegetation"];
