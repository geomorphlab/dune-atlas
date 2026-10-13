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
  /** what "dunes" means for a cell of this grid */
  dunesRule: string;
}

/** Dataset-independent definitions (the same text for every wind dataset). */
export const LAND_RULE = "land cells (land–sea mask fraction above 0.5); ocean cells have no wind data";
export const DUNES_RULE = "the cell overlaps at least one 0.1° dune cell of the dune map (Gunn 2026)";

export const DATASET_INFO: Record<string, DatasetInfo> = {
  "era5-land": {
    id: "era5-land", name: "ERA5-Land", resolution: "0.1°", resDeg: 0.1, period: "1950–2024", nHours: 657455,
    landRule: LAND_RULE,
    dunesRule: DUNES_RULE,
  },
  era5: {
    id: "era5", name: "ERA5", resolution: "0.25°", resDeg: 0.25, period: "1950–2024", nHours: 657456,
    landRule: LAND_RULE,
    dunesRule: DUNES_RULE,
  },
};

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
