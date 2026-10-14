// Everything the side panel shows for one cell at one threshold, computed without the DOM.
// Flux rose modes (time-averaged per direction bin, sum_speed n q / sum_all n):
//   flat        q from the flat-bed friction velocity u*f (flux.py flux_rose)
//   elongation  crest flux with speed-up about the field alpha_E at this u*,th (crest_flux_rose)
//   transverse  crest flux with speed-up about the field alpha_H at this u*,th
// DP/RDP/RDP/DP/RDD and all mode arrows are the cell-store fields at the current
// threshold, so the panel matches the map layers. A mode direction is only shown where its
// paired magnitude field is > 0 (see modeDefined; same rule as the map's mask).
import { C } from "../util/constants";
import { DIRECTION_MASK_VAR } from "../layerconfig";
import { mathToAxisDeg, mathToBearingDeg } from "../util/angles";
import type { CellData } from "./cellstore";
import { fieldValue, nUt } from "./cellstore";
import { crestFluxRose, fluxRoseByExcessShear, fluxRose, thresholdWindSpeed, DEFAULT_BINS, EXCESS_SHEAR_EDGES } from "./flux";
import { sectorSums, windRoseData, type WindRose } from "./roses";

export const MODE_STYLE = {
  // one name per quantity (review L5): the layer-list names; αH is an axis (0–180°), the crest line
  at: { label: "αT (transverse migration direction)", tex: "$\\alpha_T$", color: "#ff6b6b" },
  ae: { label: "αE (elongation direction)", tex: "$\\alpha_E$", color: "#4dabf7" },
  ao: { label: "αO (oblique elongation direction)", tex: "$\\alpha_O$", color: "#c77dff", dash: "0.5 3.5" },
  ab: { label: "αH (migration-mode crest orientation)", tex: "$\\alpha_H$", color: "#69db7c", dash: "5 3" },
  rdpa: { label: "RDD (resultant drift direction)", tex: "$RDD$", color: "#f1f3f5", dash: "2 2" },
} as const;
export type ModeKey = keyof typeof MODE_STYLE;
export const MODE_KEYS: ModeKey[] = ["at", "ae", "ao", "ab", "rdpa"];
/** modes drawn as arrows on the flux rose (αO only in the polar plot, to keep the rose legible) */
export const ROSE_ARROW_KEYS: ModeKey[] = ["ab", "ae", "at", "rdpa"];

export type FluxMode = "flat" | "elongation" | "transverse";
export const FLUX_MODES: { id: FluxMode; label: string; totalTex: string; totalText: string }[] = [
  { id: "flat", label: "Flat bed", totalTex: "$DP$", totalText: "DP" },
  { id: "elongation", label: "Elongation (αE)", totalTex: "$\\langle|Q(\\alpha_E)|\\rangle$", totalText: "⟨|Q(αE)|⟩" },
  { id: "transverse", label: "Transverse migration (αH)", totalTex: "$\\langle|Q(\\alpha_H)|\\rangle$", totalText: "⟨|Q(αH)|⟩" },
];

/** Field that must be > 0 (finite) for each mode direction to be shown: the map's
 *  direction-validity mask (layerconfig DIRECTION_MASK_VAR), so the panel and the map agree:
 *  RDD needs RDP > 0 (rdpm), αH/αT need bed-mode crest flux (qacb), αE/αO need
 *  elongation-mode crest flux (qace). */
export const MODE_DEFINED_BY: Record<ModeKey, string[]> = Object.fromEntries(
  (["at", "ae", "ao", "ab", "rdpa"] as const).map((k) => [k, [DIRECTION_MASK_VAR[k]]]),
) as Record<ModeKey, string[]>;

/** Is mode `k` defined at threshold index `i` (its defining flux is finite and > 0)? */
export function modeDefined(cell: CellData, k: ModeKey, i: number): boolean {
  let s = 0;
  for (const v of MODE_DEFINED_BY[k]) {
    const x = fieldValue(cell, v, i);
    if (!Number.isFinite(x)) return false;
    s += x;
  }
  return s > 0;
}

/** Excess-shear classes stacking the flux rose: u* : u*,th (flat bed u*f; crest modes uc). */
export const EXCESS_CLASSES = EXCESS_SHEAR_EDGES.slice(0, -1).map((lo, k) => {
  const hi = EXCESS_SHEAR_EDGES[k + 1];
  return Number.isFinite(hi) ? `${lo}–${hi}` : `> ${lo}`;
});
/** dark → bright with increasing excess shear (readable on the dark panel) */
export const EXCESS_COLORS = ["#8c4a2f", "#b85a2a", "#d9772a", "#ec9a35", "#f6c25a", "#fde68f"];

export interface CellView {
  utIndex: number;
  ut: number;
  windRose: WindRose;
  fluxMode: FluxMode;
  /** time-averaged flux per direction bin (m^2/yr), toward */
  fluxPerBin: number[];
  /** the same aggregated into sectors by the bearing sand moves toward (m^2/yr) */
  fluxSectors: number[];
  /** fluxSectors as % of their total (sums to 100; all 0 if no transport) */
  fluxSectorsPct: number[];
  /** fluxSectors split by excess-shear class: [sector][class] (m^2/yr); rows sum to fluxSectors */
  fluxStack: number[][];
  /** fluxStack as % of fluxTotal */
  fluxStackPct: number[][];
  /** sum of the petals (m^2/yr): DP (flat) or <|Q(alpha)|> (crest modes); NaN if alpha undefined */
  fluxTotal: number;
  /** field bearings at this threshold (deg, toward; ab as axis 0-180); NaN if undefined */
  modes: Record<ModeKey, number>;
  /** mode bearings over all thresholds (NaN where undefined) */
  modeSeries: Record<ModeKey, number[]>;
  /** map fields at this threshold: DP, RDP (m^2/yr), RDP/DP, RDD (bearing deg, toward) */
  drift: { dp: number; rdp: number; ratio: number; rddBearing: number };
  thresholdWind10m: number;
  /** u*,th values of this cell store */
  utValues: number[];
}

export function analyseCell(cell: CellData, utIndex: number, opts: { windSectors?: number; fluxSectors?: number; fluxMode?: FluxMode } = {}): CellView {
  const utValues = cell.utValues ?? C.UT_VALUES;
  const bins = cell.bins ?? DEFAULT_BINS;
  const ut = utValues[utIndex];
  const mode = opts.fluxMode ?? "flat";
  let rose: Float64Array;
  let classes: Float64Array[];
  let ok = true;
  const nUa = bins.uaCentres.length;
  if (mode === "flat") {
    rose = fluxRose(cell.hist, ut, bins);
    classes = fluxRoseByExcessShear(cell.hist, ut, null, bins);
  } else {
    const alpha = fieldValue(cell, mode === "elongation" ? "ae" : "ab", utIndex);
    ok = Number.isFinite(alpha);
    rose = ok ? crestFluxRose(cell.hist, ut, alpha, bins) : new Float64Array(nUa);
    classes = ok ? fluxRoseByExcessShear(cell.hist, ut, alpha, bins) : EXCESS_CLASSES.map(() => new Float64Array(nUa));
  }
  const perBin = Array.from(rose, (v) => (Number.isFinite(v) ? v * C.S2Y : 0));
  const conv = (v: ModeKey) => (v === "ab" ? mathToAxisDeg : mathToBearingDeg);
  const bearingAt = (v: ModeKey, i: number) => {
    if (!modeDefined(cell, v, i)) return NaN;
    const a = fieldValue(cell, v, i);
    return Number.isFinite(a) ? conv(v)(a) : NaN;
  };
  const n = nUt(cell);
  const sectors = sectorSums(perBin, opts.fluxSectors ?? 32, bins.uaCentres);
  const total = sectors.reduce((a, b) => a + b, 0);
  const perClass = classes.map((c) => sectorSums(Array.from(c, (v) => (Number.isFinite(v) ? v * C.S2Y : 0)), sectors.length, bins.uaCentres));
  const stack = sectors.map((_, s) => perClass.map((c) => c[s]));
  return {
    utIndex,
    ut,
    windRose: windRoseData(cell.hist, opts.windSectors ?? 16, undefined, bins),
    fluxMode: mode,
    fluxPerBin: perBin,
    fluxSectors: sectors,
    fluxSectorsPct: sectors.map((v) => (total > 0 ? (100 * v) / total : 0)),
    fluxStack: stack,
    fluxStackPct: stack.map((r) => r.map((v) => (total > 0 ? (100 * v) / total : 0))),
    fluxTotal: ok ? total : NaN,
    modes: Object.fromEntries(MODE_KEYS.map((k) => [k, bearingAt(k, utIndex)])) as Record<ModeKey, number>,
    modeSeries: Object.fromEntries(MODE_KEYS.map((k) => [k, Array.from({ length: n }, (_, i) => bearingAt(k, i))])) as Record<ModeKey, number[]>,
    drift: {
      dp: fieldValue(cell, "dpm", utIndex) * C.S2Y,
      rdp: fieldValue(cell, "rdpm", utIndex) * C.S2Y,
      ratio: fieldValue(cell, "qha_rdp_dp", utIndex),
      rddBearing: bearingAt("rdpa", utIndex),
    },
    thresholdWind10m: thresholdWindSpeed(ut),
    utValues,
  };
}
