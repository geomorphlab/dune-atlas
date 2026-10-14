// Shared helpers of the Mars tests (run with VITE_BODY=mars: npm run test:mars).
import fs from "node:fs";
import path from "node:path";
import fixture from "../fixtures/mars-rose-parity.json";
import type { MarsCellData, MarsSeries } from "../../src/bodies/mars/cell/cellstore";
import { MARS_BINS } from "../../src/bodies/mars/cell/cellstore";
import { cellFromIndex } from "../../src/cell/snap";
import { M } from "../../src/cell/marsphysics";
import { MARS_GRID } from "../../src/bodies/mars/body";
import { C } from "../../src/util/constants";

export const FIELD_VARS = C.QSAT_VARS.filter((v) => !C.WITHHELD_VARS.includes(v));
export interface RoseCase { dIndex: number; dUm: number; alpha: number | null; rose: number[]; classes: number[][]; nHours: number; bins?: number[]; stats: Record<string, number> }
export interface RoseCell { iy: number; ix: number; series: Record<string, string>; cases: RoseCase[] }
export const ROSE_FIXTURE = fixture as unknown as { cells: RoseCell[] };

const f32 = (b64: string) => { const b = Buffer.from(b64, "base64"); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice(); };
export const seriesOf = (c: RoseCell): MarsSeries => ({ u: f32(c.series.u), v: f32(c.series.v), T: f32(c.series.T), rho: f32(c.series.rho), z: f32(c.series.z) });

/** a Mars cell with the fixture series and simple fields (directions defined at every d) */
export function makeMarsCell(k = 0, o: Partial<MarsCellData> = {}): MarsCellData {
  const rc = ROSE_FIXTURE.cells[k];
  const series = seriesOf(rc);
  const n = series.u.length;
  const ref = cellFromIndex(rc.iy, rc.ix, MARS_GRID);
  const fields = new Float32Array(FIELD_VARS.length * 64).fill(0.3e-7);
  const set = (v: string, val: number) => fields.fill(val, FIELD_VARS.indexOf(v) * 64, FIELD_VARS.indexOf(v) * 64 + 64);
  set("ae", 0.3); set("ab", 1.2); set("at", 2.77); set("ao", 1.2); set("rdpa", -0.4); set("qha_rdp_dp", 0.8);
  return {
    ...ref, body: "mars", hist: new Uint32Array(0), fields, fieldVars: FIELD_VARS, bins: MARS_BINS, utValues: M.D_VALUES_UM, grid: MARS_GRID,
    dune: true, duneFrac: 0.04, hasData: true, totalHours: n - 3, series,
    ls: Float32Array.from({ length: n }, (_, h) => (360 * h) / 16032), sol: Float32Array.from({ length: n }, (_, h) => h / 24), dValuesUm: M.D_VALUES_UM,
    aux: { series: { qsdiv: Float32Array.from({ length: 64 }, (_, i) => -2e-4 + i * 5e-6) }, scalars: { rho_mean: 0.0153, elev_mean: -1840 }, attrs: {} },
    ...o,
  };
}

/** local range-read store over a zarr directory (as tests/cellstore.test.ts) */
export class RangeFileStore {
  constructor(private root: string) {}
  async get(key: string) { const p = this.root + key; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
  async getRange(key: string, r: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + key;
    if (!fs.existsSync(p)) return undefined;
    const size = fs.statSync(p).size;
    const [off, len] = "suffixLength" in r ? [size - r.suffixLength, r.suffixLength] : [r.offset, r.length];
    const fd = fs.openSync(p, "r"); const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd);
    return new Uint8Array(b);
  }
}
export const FIXTURE_ROOT = path.resolve(__dirname, "../../../staging/fixture-mars/dune-atlas/mars/v1");
// dataset stores moved to mars/v2 with the packed-sand fluxes (phi = 0.6); body-level objects stay under mars/v1
export const FIXTURE_DS = path.resolve(__dirname, "../../../staging/fixture-mars/dune-atlas/mars/v2/datasets/fv3-beta1");
export const haveFixture = fs.existsSync(path.join(FIXTURE_DS, "cells.zarr", "zarr.json"));
