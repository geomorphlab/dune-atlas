// Everything the Mars cell panel shows for one cell at one grain diameter, without the DOM: the
// Earth CellView (cell/analysis.ts) computed from the hourly series instead of the histogram.
// Flux rose modes as Earth: flat (q from u*), elongation / transverse (crest flux about the stored
// alpha_E / alpha_H at this d). DP / RDP / RDP/DP / RDD and the mode arrows are the cell-store
// fields at this d, so the panel matches the map layers.
import { M } from "../marsphysics";
import { fieldValue, nUt } from "../../../core/cell/cellstore";
import { EXCESS_CLASSES, MODE_KEYS, modeDefined, type CellView, type FluxMode, type ModeKey } from "../../../core/cell/analysis";
import { sectorSums } from "../../../core/cell/roses";
import { mathToAxisDeg, mathToBearingDeg } from "../../../core/util/angles";
import { DEFAULT_BINS } from "../../../core/cell/flux";
import type { MarsCellData } from "./cellstore";
import { marsFluxRoses, marsWindRose, thresholdStats, type ThresholdStats } from "./marsflux";

export interface MarsCellView extends CellView {
  /** grain diameter d (µm) of this view (= `ut` of the Earth view, which holds d on Mars) */
  dUm: number;
  stats: ThresholdStats;
}

/** time-averaged rose of one mode (m^2/s per direction bin) and its excess-shear split; null alpha
 *  undefined (crest mode without a direction at this d) */
export function marsModeRoses(cell: MarsCellData, dIndex: number, mode: FluxMode) {
  const dUm = cell.dValuesUm[dIndex];
  if (mode === "flat") return marsFluxRoses(cell.series, dUm, null);
  const key: ModeKey = mode === "elongation" ? "ae" : "ab";
  const alpha = fieldValue(cell, key, dIndex);
  if (!Number.isFinite(alpha) || !modeDefined(cell, key, dIndex)) return null;
  return marsFluxRoses(cell.series, dUm, alpha);
}

export function analyseMarsCell(cell: MarsCellData, dIndex: number, opts: { windSectors?: number; fluxSectors?: number; fluxMode?: FluxMode } = {}): MarsCellView {
  const dValues = cell.dValuesUm;
  const dUm = dValues[dIndex];
  const ua = DEFAULT_BINS.uaCentres;
  const mode = opts.fluxMode ?? "flat";
  const r = marsModeRoses(cell, dIndex, mode);
  const ok = r !== null;
  const nUa = ua.length;
  const rose = r?.rose ?? new Float64Array(nUa);
  const classes = r?.classes ?? EXCESS_CLASSES.map(() => new Float64Array(nUa));
  const perBin = Array.from(rose, (v) => (Number.isFinite(v) ? v * M.S2Y : 0));
  const conv = (v: ModeKey) => (v === "ab" ? mathToAxisDeg : mathToBearingDeg);
  const bearingAt = (v: ModeKey, i: number) => {
    if (!modeDefined(cell, v, i)) return NaN;
    const a = fieldValue(cell, v, i);
    return Number.isFinite(a) ? conv(v)(a) : NaN;
  };
  const n = nUt(cell);
  const sectors = sectorSums(perBin, opts.fluxSectors ?? 32, ua);
  const total = sectors.reduce((a, b) => a + b, 0);
  const perClass = classes.map((c) => sectorSums(Array.from(c, (v) => (Number.isFinite(v) ? v * M.S2Y : 0)), sectors.length, ua));
  const stack = sectors.map((_, s) => perClass.map((c) => c[s]));
  const stats = thresholdStats(cell.series, dUm);
  return {
    utIndex: dIndex,
    ut: dUm,
    dUm,
    windRose: marsWindRose(cell.series, opts.windSectors ?? 16),
    fluxMode: mode,
    fluxPerBin: perBin,
    fluxSectors: sectors,
    fluxSectorsPct: sectors.map((v) => (total > 0 ? (100 * v) / total : 0)),
    fluxStack: stack,
    fluxStackPct: stack.map((row) => row.map((v) => (total > 0 ? (100 * v) / total : 0))),
    fluxTotal: ok ? total : NaN,
    modes: Object.fromEntries(MODE_KEYS.map((k) => [k, bearingAt(k, dIndex)])) as Record<ModeKey, number>,
    modeSeries: Object.fromEntries(MODE_KEYS.map((k) => [k, Array.from({ length: n }, (_, i) => bearingAt(k, i))])) as Record<ModeKey, number[]>,
    drift: {
      dp: fieldValue(cell, "dpm", dIndex) * M.S2Y,
      rdp: fieldValue(cell, "rdpm", dIndex) * M.S2Y,
      ratio: fieldValue(cell, "qha_rdp_dp", dIndex),
      rddBearing: bearingAt("rdpa", dIndex),
    },
    thresholdWind10m: stats.windAtMedian,
    utValues: dValues,
    stats,
  };
}
