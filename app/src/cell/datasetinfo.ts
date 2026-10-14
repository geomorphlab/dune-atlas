// Wind datasets as described in the panel and the downloads (name, resolution, period, hours,
// land-cell and dune rules). Unknown ids fall back to ERA5-Land; the resolution and the 30″
// pixel count per cell can also be derived from a cell-store grid.
import type { Grid } from "./snap";

export interface DatasetInfo {
  id: string;
  /** reanalysis name, e.g. "ERA5-Land" */
  name: string;
  /** grid spacing as text, e.g. "0.1°" */
  resolution: string;
  resDeg: number;
  period: string;
  /** hours in the record */
  nHours: number;
  /** which cells carry wind data */
  landRule: string;
  /** land–sea mask fraction above which a cell is a land cell (wind data) */
  landThreshold: number;
  /** why a cell outside the land mask has no statistics (non-land message) */
  nonLandReason: string;
  /** what "dunes" means for a cell of this grid */
  dunesRule: string;
  /** About, Data sources: the dataset's item (HTML, after its bold title "Wind histograms and sand-flux fields
   *  (<name> <resolution>)"); dataset facts live here, not in general text */
  sourceHtml: string;
  /** its bold title there; default "Wind histograms and sand-flux fields (<name> <resolution>)" */
  sourceTitle?: string;
  /** where the map fields come from: the paper's data record ("paper") or computed for the atlas ("atlas");
   *  sets the map attribution line (citation.ts mapAttributionHtml) */
  fieldsFrom: "paper" | "atlas";
}

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

/** Tooltip of the Wind dataset selector (app text; not the generated registry description, which
 *  names store internals): "ERA5 0.25°, 1950–2024; land cells: land–sea mask fraction > 0". */
export function datasetTooltip(id: string): string {
  const d = DATASET_INFO[id];
  return d ? `${d.name} ${d.resolution}, ${d.period}; land cells: land–sea mask fraction > ${d.landThreshold}` : "";
}

/** distinct values of one dataset fact, joined with " or " (e.g. the grids "0.1° or 0.25°", the period
 *  "1950–2024"): general text names the datasets' facts from this table, never by hand */
export function datasetSourceItem(d: DatasetInfo): string {
  return `<li><strong>${d.sourceTitle ?? `Wind histograms and sand-flux fields (${d.name} ${d.resolution})`}</strong>: ${d.sourceHtml}</li>`;
}
export function datasetFacts(key: "resolution" | "period" | "name", infos: DatasetInfo[] = Object.values(DATASET_INFO)): string {
  return [...new Set(infos.map((d) => d[key]))].join(" or ");
}

export function datasetInfo(id?: string): DatasetInfo {
  return (id && DATASET_INFO[id]) || DATASET_INFO["era5-land"];
}

/** grid spacing in degrees (from the cell-store grid when known) */
export function cellSizeDeg(grid?: Pick<Grid, "dlat">, id?: string): number {
  return grid ? Math.abs(grid.dlat) : datasetInfo(id).resDeg;
}
/** "0.1°" / "0.25°" */
export function resolutionText(deg: number): string {
  return `${Number(deg.toPrecision(6))}°`;
}
/** nominal number of 30-arc-second pixels in one cell (0.1°: 144, 0.25°: 900) */
export function pixelsPerCell(deg: number): number {
  return Math.round((deg * 120) ** 2);
}
