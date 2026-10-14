// Wind datasets as described in the panel and the downloads (name, resolution, period, hours,
// land-cell and dune rules) and their credits: from the body's registry entries (`datasets[].info`,
// `credits`, `citationSources`), so a dataset is added in the registry alone. Unknown ids fall back to the
// default dataset. The resolution and the 30″ pixel count per cell can also be derived from a cell-store
// grid.
import type { Grid } from "./snap";
import { loadRegistry } from "../registry/load";
import type { CitationSourceDef, DatasetCredits, DatasetInfoDef } from "../registry/types";

/** a wind dataset as the panel, About and downloads describe it: the registry entry's `info` with its id
 *  (field meanings: registry/layers.schema.json, datasets[].info) */
export interface DatasetInfo extends DatasetInfoDef { id: string }

const REG = loadRegistry().registry;
const DATASETS = REG.datasets ?? [];
/** the body's wind datasets in registry order */
export const DATASET_INFO: Record<string, DatasetInfo> = Object.fromEntries(DATASETS.filter((d) => d.info).map((d) => [d.id, { id: d.id, ...d.info! }]));
const CREDITS: Record<string, DatasetCredits> = Object.fromEntries(DATASETS.filter((d) => d.credits).map((d) => [d.id, d.credits!]));
const DEFAULT_ID = REG.defaultDataset && DATASET_INFO[REG.defaultDataset] ? REG.defaultDataset : Object.keys(DATASET_INFO)[0];
/** citation sources defined by the datasets (registry `citationSources`) */
export const DATASET_CITATION_SOURCES: CitationSourceDef[] = DATASETS.flatMap((d) => d.citationSources ?? []);

/** citations and notices of a dataset (registry `credits`); unknown ids: the default dataset's */
export function datasetCredits(id?: string): DatasetCredits {
  return (id && CREDITS[id]) || CREDITS[DEFAULT_ID];
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
  return (id && DATASET_INFO[id]) || DATASET_INFO[DEFAULT_ID];
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
