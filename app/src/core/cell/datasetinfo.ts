// Wind datasets as described in the panel and the downloads (name, resolution, period, hours,
// land-cell and dune rules). The table is per body (@body/datasetinfo); unknown ids fall back to the
// body's first dataset. The resolution and the 30″ pixel count per cell can also be derived from a
// cell-store grid.
import type { Grid } from "./snap";
import { DATASET_INFO } from "@body/datasetinfo";
export { DATASET_INFO };

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

/** Tooltip of the Wind dataset selector (app text; not the generated registry description, which
 *  names store internals): "ERA5 0.25°, 1950–2024; land cells: land–sea mask fraction > 0". A dataset
 *  without a land mask (empty nonLandReason: every cell has data) has no land clause. */
export function datasetTooltip(id: string): string {
  const d = DATASET_INFO[id];
  if (!d) return "";
  return d.nonLandReason ? `${d.name} ${d.resolution}, ${d.period}; land cells: land–sea mask fraction > ${d.landThreshold}` : `${d.name} ${d.resolution}, ${d.period}`;
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
  return (id && DATASET_INFO[id]) || Object.values(DATASET_INFO)[0];
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
