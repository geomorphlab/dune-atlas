// Physical/grid constants exported from pipeline/src/dune_atlas_pipeline/constants.py
// (scripts/export-constants.py). Never hand-edit the JSON.
import raw from "../generated/constants.json";

export interface Constants {
  Z: number; Z0: number; KAPPA: number; BETA: number; DASPECT: number; G: number;
  RHO_S: number; RHO_F: number; FLUXCONSTANT: number; FLUXK: number; S2Y: number;
  N_HOURS: number; UT_DEFAULT_INDEX: number;
  UM_EDGES: number[]; UA_EDGES: number[]; UM_CENTRES: number[]; UA_CENTRES: number[]; UT_VALUES: number[];
  QSAT_VARS: string[];
  /** qsat fields withheld from the atlas (none) */
  WITHHELD_VARS: string[];
}
export const C: Constants = raw as Constants;
export const N_UM = C.UM_CENTRES.length; // 128 speed bins
export const N_UA = C.UA_CENTRES.length; // 128 direction bins
export const N_UT = C.UT_VALUES.length;  // 64 thresholds
export const WITHHELD = new Set(C.WITHHELD_VARS);
/** true if a qsat field may be shown (not in WITHHELD_VARS) */
export const isPublishedField = (v: string) => !WITHHELD.has(v);
