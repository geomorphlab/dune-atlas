// Earth wind datasets (ERA5-Land 0.1°, ERA5 0.25°) as described in the panel and the downloads;
// the first entry is the fallback for unknown ids. Shared functions: cell/datasetinfo.ts.
import type { DatasetInfo } from "../../core/cell/datasetinfo";

/** Land definitions (app constants: the text shown and exported never comes from store attrs).
 *  ERA5-Land: land–sea mask fraction > 0.5; ERA5: > 0 (any land in the 0.25° cell). */
export const LAND_RULE = "land cells (land–sea mask fraction above 0.5); ocean cells have no wind data";
export const LAND_RULE_ERA5 = "land cells (land–sea mask fraction above 0, i.e. any land in the cell); cells without land have no wind data";
export const DUNES_RULE = "the cell overlaps at least one 0.1° dune cell of the dune map (Gunn 2026)";

export const DATASET_INFO: Record<string, DatasetInfo> = {
  "era5-land": {
    id: "era5-land", name: "ERA5-Land", resolution: "0.1°", resDeg: 0.1, period: "1950–2024", nHours: 657455,
    landRule: LAND_RULE, landThreshold: 0.5, nonLandReason: "This cell is mainly water",
    dunesRule: DUNES_RULE, fieldsFrom: "paper",
    sourceHtml: "ERA5-Land 1950–2024 hourly 10 m winds (0.1°) and the qsat parameters of Gunn (2026), Supplementary Data (Zenodo, CC BY 4.0). Drift potentials (DP, RDP, RDD, RDP/DP) and crest fluxes are averages over the hourly record.",
  },
  era5: {
    id: "era5", name: "ERA5", resolution: "0.25°", resDeg: 0.25, period: "1950–2024", nHours: 657456,
    landRule: LAND_RULE_ERA5, landThreshold: 0, nonLandReason: "This cell has no land (land–sea mask fraction 0)",
    dunesRule: DUNES_RULE, fieldsFrom: "atlas",
    sourceHtml: "ERA5 1950–2024 hourly 10 m winds on the 0.25° grid (Hersbach et al. 2020; Copernicus Climate Change Service, accessed via the NCI Australia replica); the histograms and the 23 sand-flux fields are computed for the atlas with the methods outlined in Gunn (2026). Cells with an ERA5 land–sea mask fraction above 0 (any land in the cell) carry wind data; a 0.25° cell counts as a dune cell where it overlaps a mapped 0.1° dune cell.",
  },
};
