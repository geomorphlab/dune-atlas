// Wind datasets as described in the panel and the downloads (name, resolution, period, hours,
// land-cell and dune rules) and their credits: from the body's registry entries (`datasets[].info`,
// `credits`, `citationSources`), so a dataset is added in the registry alone. Unknown ids fall back to the
// default dataset. The resolution and the 30″ pixel count per cell can also be derived from a cell-store
// grid.
import { gridLatRange, type Grid } from "./snap";
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

/** Tooltip of the Wind dataset selector (not the generated registry description, which names store internals):
 *  "ERA5 0.25°, 1950–2024; land cells: land–sea mask fraction > 0" (the registry info.landShort). A dataset
 *  without a land mask (empty nonLandReason: every cell has data) has no land clause. */
export function datasetTooltip(id: string): string {
  const d = DATASET_INFO[id];
  if (!d) return "";
  return d.nonLandReason ? `${d.name} ${d.resolution}, ${d.period}; ${d.landShort ?? "land cells only"}` : `${d.name} ${d.resolution}, ${d.period}`;
}
/** "MCMC FV3: free-running climate-model simulation; EMARS and MACDA: reanalysis of ..." (registry info.kind; datasets
 *  of the same kind named together), "" if no dataset has a kind */
export function datasetKindsText(infos: DatasetInfo[] = Object.values(DATASET_INFO)): string {
  const by = new Map<string, string[]>();
  for (const d of infos) if (d.kind) by.set(d.kind, [...(by.get(d.kind) ?? []), d.name]);
  const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  return [...by].map(([k, names]) => `${and(names)}: ${k}`).join("; ");
}
/** the registry notes of the datasets (info.note), one sentence each */
export const datasetNotes = (infos: DatasetInfo[] = Object.values(DATASET_INFO)): string[] => infos.flatMap((d) => (d.note ? [d.note] : []));
/** map / About attribution lines of the datasets (credits.mapNotice), without repeats */
export const datasetMapNotices = (ids: string[] = Object.keys(DATASET_INFO)): string[] => [...new Set(ids.flatMap((id) => { const n = datasetCredits(id).mapNotice; return n ? [n] : []; }))];

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
/** grid spacing of a cell-store grid as text: "2°" (square cells), "6° × 5.14°" (longitude × latitude) */
export function gridResolutionText(g: Pick<Grid, "dlat" | "dlon">): string {
  const dy = Math.abs(g.dlat), dx = Math.abs(g.dlon);
  if (Math.abs(dx - dy) < 1e-9) return resolutionText(dy);
  const r = (v: number) => `${Number(v.toPrecision(3))}°`;
  return `${r(dx)} × ${r(dy)}`;
}

/** cell-centre grid of a dataset from its registry entry (`info.grid`; the cell store's root attrs grid) */
export function datasetGrid(id?: string): Grid | undefined {
  const g = datasetInfo(id)?.grid;
  return g ? { lat0: g.lat0, dlat: g.dlat, lon0: g.lon0, dlon: g.dlon, ny: g.ny, nx: g.nx } : undefined;
}

const latText = (v: number) => `${Number(Math.abs(v).toFixed(2))}° ${v >= 0 ? "N" : "S"}`;
/** Why a point has no cell: it lies poleward of the rows of a grid that stops short of the pole
 *  (snap.ts gridLatRange), e.g. "No EMARS v1.0 data poleward of 87.43° N: the northernmost cells of its grid
 *  are centred at 84.86° N." */
export function outsideGridText(lat: number, g: Grid, name: string): string {
  const [s, n] = gridLatRange(g), north = lat >= 0;
  const centre = north ? Math.max(g.lat0, g.lat0 + g.dlat * (g.ny - 1)) : Math.min(g.lat0, g.lat0 + g.dlat * (g.ny - 1));
  return north
    ? `No ${name} data poleward of ${latText(n)}: the northernmost cells of its grid are centred at ${latText(centre)}.`
    : `No ${name} data poleward of ${latText(s)}: the southernmost cells of its grid are centred at ${latText(centre)}.`;
}

/** nominal number of 30-arc-second pixels in one cell (0.1°: 144, 0.25°: 900; `degLon`: the longitude spacing
 *  of non-square cells, MERRA-2 0.5° × 0.625°: 4500) */
export function pixelsPerCell(deg: number, degLon = deg): number {
  return Math.round(deg * 120 * degLon * 120);
}

/** the dataset whose registry grid (info.grid) has this latitude / longitude spacing */
export function datasetOfSpacing(deg: number, degLon = deg): DatasetInfo | undefined {
  return Object.values(DATASET_INFO).find((d) => d.grid && Math.abs(Math.abs(d.grid.dlat) - deg) < 1e-9 && Math.abs(Math.abs(d.grid.dlon) - degLon) < 1e-9);
}
/** cell size in text: the dataset's own wording where a dataset has this spacing ("0.25°", "0.5° × 0.625°",
 *  "0.375°" for the Gaussian JRA-3Q rows), else "0.1°" (square) or "a° × b°" (latitude × longitude) */
export function cellSizeText(deg: number, degLon = deg): string {
  const d = datasetOfSpacing(deg, degLon);
  if (d) return d.resolution;
  return Math.abs(deg - degLon) < 1e-9 ? resolutionText(deg) : `${resolutionText(deg)} × ${resolutionText(degLon)}`;
}
/** half the cell size in text, for "centre ± {half}": "0.125°", or "0.25° in latitude and ± 0.3125° in longitude" */
export function halfCellText(deg: number, degLon = deg): string {
  return Math.abs(deg - degLon) < 1e-9 ? resolutionText(deg / 2) : `${resolutionText(deg / 2)} in latitude and ± ${resolutionText(degLon / 2)} in longitude`;
}
