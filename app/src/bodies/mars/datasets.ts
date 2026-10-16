// Grid and sampling of the Mars wind datasets: from the registry entry (`datasets[].info.grid`,
// `info.series`, `info.nHours`) until the cell store is open, then from the store (root attrs `grid`,
// `dataset.samples_per_sol` and the series length; data contract in docs/guide/mars.md). Also the words the
// panel and the downloads use for one sample of the series ("hourly samples", "two-hourly samples").
import { datasetGrid, datasetInfo } from "../../core/cell/datasetinfo";
import type { Grid } from "../../core/cell/snap";
import { MARS_GRID } from "./body";

/** how a dataset samples the sol, in the words of the panel and the downloads */
export interface MarsSampling {
  /** samples per sol (FV3, EMARS: 24; MACDA: 12) */
  samplesPerSol: number;
  /** "hourly", "two-hourly" */
  adjective: string;
  /** one sample and several: "hour" / "hours" for hourly data, else "sample" / "samples" */
  unit: string;
  units: string;
  /** "one sample per Mars hour", "one sample every two Mars hours" */
  every: string;
}

const NUMBER_WORDS: Record<number, string> = { 2: "two", 3: "three", 4: "four", 6: "six", 8: "eight", 12: "twelve" };

export function marsSampling(samplesPerSol = 24): MarsSampling {
  const n = Number.isInteger(samplesPerSol) && samplesPerSol > 0 ? samplesPerSol : 24;
  if (n === 24) return { samplesPerSol: 24, adjective: "hourly", unit: "hour", units: "hours", every: "one sample per Mars hour" };
  const k = 24 / n, w = NUMBER_WORDS[k] ?? String(k);
  return Number.isInteger(k)
    ? { samplesPerSol: n, adjective: `${w}-hourly`, unit: "sample", units: "samples", every: `one sample every ${w} Mars hours` }
    : { samplesPerSol: n, adjective: `${n}-per-sol`, unit: "sample", units: "samples", every: `${n} samples per sol` };
}

/** grid and length of a dataset's series */
export interface MarsTiming {
  id: string;
  grid: Grid;
  sampling: MarsSampling;
  /** samples in the record (the store's series length when known, else the registry's nHours) */
  nSamples: number;
  /** sols in the record (nSamples / samples per sol) */
  nSols: number;
}

/** what a cell store tells about its dataset (MarsCellStore: root attrs and series shape) */
export interface MarsStoreTiming { grid?: Grid; samplesPerSol?: number; nHours?: number; datasetId?: string }

/** Grid and sampling of dataset `id`: the open store's values where given, else the registry entry's. */
export function marsTiming(id?: string, store: MarsStoreTiming = {}): MarsTiming {
  const info = datasetInfo(store.datasetId ?? id);
  const sampling = marsSampling(store.samplesPerSol ?? info.series?.samplesPerSol ?? 24);
  const nSamples = store.nHours ?? info.nHours;
  return { id: info.id, grid: store.grid ?? datasetGrid(info.id) ?? MARS_GRID, sampling, nSamples, nSols: nSamples / sampling.samplesPerSol };
}
