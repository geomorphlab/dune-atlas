// Mars wind dataset as described in the panel and the downloads (replaces cell/datasetinfo.ts in
// the Mars build). One dataset: the MCMC FV3 beta release 1 (2°, hourly, one Mars year).
import type { Grid } from "../../cell/snap";
export type { DatasetInfo } from "../../cell/datasetinfo";
export { resolutionText, pixelsPerCell } from "../../cell/datasetinfo";
import type { DatasetInfo } from "../../cell/datasetinfo";

export const LAND_RULE = "every cell (Mars has no land mask: all 16,200 cells carry wind data)";
/** Earth-only (ERA5 land mask); kept so the Mars module exports the Earth module's names. Unused on Mars. */
export const LAND_RULE_ERA5 = LAND_RULE;
export const DUNES_RULE = "the cell overlaps at least one dune polygon of the merged dune map (USGS Mars Global Digital Dune Database and Fenton 2020)";

export const DATASET_INFO: Record<string, DatasetInfo> = {
  "fv3-beta1": {
    id: "fv3-beta1", name: "MCMC FV3", resolution: "2°", resDeg: 2, period: "one Mars year (6th simulated year, 668 sols)", nHours: 16032,
    landRule: LAND_RULE, landThreshold: 0, nonLandReason: "", // no land mask: every cell has data
    dunesRule: DUNES_RULE,
  },
};

export function datasetInfo(id?: string): DatasetInfo {
  return (id && DATASET_INFO[id]) || DATASET_INFO["fv3-beta1"];
}

export function cellSizeDeg(grid?: Pick<Grid, "dlat">, id?: string): number {
  return grid ? Math.abs(grid.dlat) : datasetInfo(id).resDeg;
}

/** Tooltip of the wind dataset selector (Earth edcbb50/c6a2cd3 add the same export; the selector only
 *  appears with a second dataset): "MCMC FV3 2°, one Mars year (...)". Mars has no land mask. */
export function datasetTooltip(id: string): string {
  const d = DATASET_INFO[id];
  return d ? `${d.name} ${d.resolution}, ${d.period}` : "";
}
