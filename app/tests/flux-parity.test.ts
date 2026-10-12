// TS flux port vs pipeline flux.py (fixture: tests/fixtures/flux-parity.json from
// scripts/make-parity-fixture.py), 7 cells x 6 thresholds.
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/flux-parity.json";
import { crestFluxRose, dpRdpRdd, fluxRoseByExcessShear, EXCESS_SHEAR_EDGES, fluxRose, flatFlux, flatFrictionVelocity } from "../src/cell/flux";
import { sectorSums } from "../src/cell/roses";
import { C } from "../src/util/constants";

interface PyRes { dp: number; rdp: number; rdd: number; qd: (number | null)[] }
interface PyCell {
  name: string; iy: number; ix: number; hist_idx: number[]; hist_cnt: number[]; hist_sum: number; synthetic: boolean;
  crest?: Record<"elongation" | "transverse", ({ alpha: number; qd: (number | null)[]; total: number } | null)[]>;
  fields?: { dpm: (number | null)[]; rdpm: (number | null)[]; rdpa: (number | null)[]; qha_rdp_dp: (number | null)[] };
  flux: PyRes[];
  excess?: { edges: (number | null)[]; cases: { ut_index: number; ae: number; flat: (number | null)[][]; elongation: (number | null)[][] }[] };
}
const F = fixture as unknown as { ut_index: number[]; ut_values: number[]; cells: PyCell[] };

function dense(c: PyCell): Uint32Array {
  const h = new Uint32Array(128 * 128);
  c.hist_idx.forEach((k, i) => (h[k] = c.hist_cnt[i]));
  return h;
}
const RTOL = 1e-12;
const close = (a: number, b: number, rtol = RTOL, atol = 0) => Math.abs(a - b) <= atol + rtol * Math.abs(b);
const angDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe("fixture coverage", () => {
  it("has >= 5 real cells, >= 4 thresholds, and an empty-direction case", () => {
    expect(F.cells.filter((c) => !c.synthetic).length).toBeGreaterThanOrEqual(5);
    expect(F.cells.filter((c) => c.fields).length).toBeGreaterThanOrEqual(5);
    expect(F.ut_index.length).toBeGreaterThanOrEqual(4);
    for (const c of F.cells) expect(c.flux.length).toBe(F.ut_index.length);
    expect(F.cells.some((c) => c.flux[0].qd.some((v) => v === 0))).toBe(true);
  });
  it("threshold values match the exported constants", () => {
    F.ut_index.forEach((k, i) => expect(F.ut_values[i]).toBe(C.UT_VALUES[k]));
  });
});

describe("flat-bed flux building blocks", () => {
  it("u*_f = um * kappa / ln(z/z0)", () => {
    const uf = flatFrictionVelocity();
    expect(uf[10]).toBeCloseTo((C.UM_CENTRES[10] * 0.41) / Math.log(1e4), 15);
  });
  it("q = 0 at or below threshold, positive above", () => {
    const q = flatFlux(0.15);
    const uf = flatFrictionVelocity();
    uf.forEach((u, i) => (u > 0.15 ? expect(q[i]).toBeGreaterThan(0) : expect(q[i]).toBe(0)));
  });
});

for (const cell of F.cells) {
  describe(`cell ${cell.name} (${cell.iy}, ${cell.ix})`, () => {
    const h = dense(cell);
    it("histogram round-trips", () => {
      expect(h.reduce((a, b) => a + b, 0)).toBe(cell.hist_sum);
    });
    F.ut_index.forEach((k, i) => {
      const py = cell.flux[i];
      it(`ut[${k}]=${F.ut_values[i].toFixed(2)}: DP, RDP, RDD and per-direction rose`, () => {
        const ut = C.UT_VALUES[k];
        const ts = dpRdpRdd(h, ut);
        expect(close(ts.dp, py.dp)).toBe(true);
        expect(close(ts.rdp, py.rdp, 1e-10, 1e-300)).toBe(true);
        if (py.rdp > 1e-12 * py.dp) expect(angDiff(ts.rdd, py.rdd)).toBeLessThan(1e-9);
        const qd = fluxRose(h, ut);
        py.qd.forEach((v, j) => expect(close(qd[j], v!, RTOL, 1e-300)).toBe(true));
        // displayed petals (sector sums) sum to DP
        const petals = sectorSums(qd, 32);
        expect(close(petals.reduce((a, b) => a + b, 0), ts.dp, 1e-12, 1e-300)).toBe(true);
      });
    });
    if (cell.crest) {
      // crest flux with speed-up vs pipeline flux.crest_flux_rose
      for (const mode of ["elongation", "transverse"] as const) {
        it(`crest flux rose (${mode}) matches flux.crest_flux_rose at all thresholds`, () => {
          F.ut_index.forEach((k, i) => {
            const py = cell.crest![mode][i];
            if (!py) return;
            const ts = crestFluxRose(h, C.UT_VALUES[k], py.alpha);
            py.qd.forEach((v, j) => expect(close(ts[j], v!, 1e-12, 1e-300)).toBe(true));
            expect(close(ts.reduce((a, b) => a + b, 0), py.total, 1e-12, 1e-300)).toBe(true);
            // speed-up never reduces the flux: crest >= flat bed in every direction
            const flat = fluxRose(h, C.UT_VALUES[k]);
            ts.forEach((v, j) => expect(v).toBeGreaterThanOrEqual(flat[j] * (1 - 1e-12)));
          });
        });
      }
    }
    if (cell.fields) {
      // What the app shows: the cell-store dpm/rdpm/rdpa/qha_rdp_dp (float32) equal the TS
      // computation from the histogram, and the flux-rose petals sum to dpm.
      it("DP/RDP/RDD and petal sum equal the map fields (float32)", () => {
        const s = cell.fields!;
        F.ut_index.forEach((k, i) => {
          const ut = C.UT_VALUES[k];
          const ts = dpRdpRdd(h, ut);
          expect(close(ts.dp, s.dpm[i]!, 1e-6, 1e-30)).toBe(true);
          expect(close(ts.rdp, s.rdpm[i]!, 1e-6, 1e-30)).toBe(true);
          if (s.rdpm[i]! > 1e-6 * s.dpm[i]!) expect(angDiff(ts.rdd, s.rdpa[i]!)).toBeLessThan(1e-5);
          if (s.qha_rdp_dp[i] !== null) expect(close(ts.rdp / ts.dp, s.qha_rdp_dp[i]!, 1e-5, 1e-7)).toBe(true);
          const petals = sectorSums(fluxRose(h, ut), 32);
          expect(close(petals.reduce((a, b) => a + b, 0), s.dpm[i]!, 1e-6, 1e-30)).toBe(true);
        });
      });
    }
  });
}

describe("edge cases", () => {
  it("empty histogram (ocean) -> undefined DP (0/0)", () => {
    const h = new Uint32Array(128 * 128);
    expect(Number.isNaN(dpRdpRdd(h, 0.15).dp)).toBe(true);
  });
});

describe("flux rose stacked by excess shear u* : u*,th", () => {
  const cells = F.cells.filter((c) => c.excess);
  it("fixture has Python references and matching class edges", () => {
    expect(cells.length).toBeGreaterThanOrEqual(1);
    for (const c of cells) expect(c.excess!.edges.map((e) => e ?? Infinity)).toEqual(EXCESS_SHEAR_EDGES);
  });
  for (const cell of cells) {
    const h = dense(cell);
    for (const ex of cell.excess!.cases) {
      const ut = C.UT_VALUES[ex.ut_index];
      for (const [mode, alpha] of [["flat", null], ["elongation", ex.ae]] as const) {
        it(`${cell.name} ut[${ex.ut_index}] ${mode}: matches flux_rose_by_excess_shear and sums to the unstacked rose`, () => {
          const ts = fluxRoseByExcessShear(h, ut, alpha);
          const py = ex[mode];
          expect(ts.length).toBe(py.length);
          ts.forEach((row, k) => row.forEach((v, j) => expect(close(v, py[k][j] ?? NaN, RTOL, 1e-300)).toBe(true)));
          const rose = alpha === null ? fluxRose(h, ut) : crestFluxRose(h, ut, alpha);
          for (let j = 0; j < rose.length; j++) expect(close(ts.reduce((a, r) => a + r[j], 0), rose[j], RTOL, 1e-300)).toBe(true);
          // sector sums of the classes equal the unstacked sector totals
          for (const n of [8, 32, 128]) {
            const tot = sectorSums(Array.from(rose), n);
            const parts = ts.map((r) => sectorSums(Array.from(r), n));
            tot.forEach((t, s) => expect(close(parts.reduce((a, p) => a + p[s], 0), t, RTOL, 1e-300)).toBe(true));
          }
        });
      }
    }
  }
  it("every flux-carrying bin falls in exactly one class (open top class)", () => {
    const h = new Uint32Array(128 * 128);
    h[127 * 128 + 3] = 10; h[40 * 128 + 70] = 5; h[2 * 128 + 9] = 7;
    for (const ut of C.UT_VALUES.slice(0, 64)) {
      const ts = fluxRoseByExcessShear(h, ut, null);
      const rose = fluxRose(h, ut);
      for (let j = 0; j < 128; j++) expect(close(ts.reduce((a, r) => a + r[j], 0), rose[j], RTOL, 1e-300)).toBe(true);
    }
  });
});
