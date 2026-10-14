// Flux roses from the hourly series (src/bodies/mars/cell/marsflux.ts) against the Python reference of
// scripts/mars/app/make_rose_fixture.py (pipeline mars/physics.py, numpy digitize/bincount).
import { describe, expect, it } from "vitest";
import { dirBin, hourState, marsFluxRoses, thresholdStats } from "../../src/bodies/mars/cell/marsflux";
import { analyseMarsCell } from "../../src/bodies/mars/cell/analysis";
import { M } from "../../src/bodies/mars/marsphysics";
import { ROSE_FIXTURE, seriesOf, makeMarsCell } from "./helpers";

const rel = (a: number, b: number) => (a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300));

describe("Mars flux roses vs the Python reference", () => {
  it("direction bins equal numpy.digitize on the Earth edges (incl. ua = +-pi)", () => {
    for (const c of ROSE_FIXTURE.cells) {
      const st = hourState(seriesOf(c));
      const ref = c.cases.find((x) => x.bins)!.bins!;
      const ts = Array.from(st.bin).filter((_, h) => st.valid[h]);
      expect(ts).toEqual(ref);
    }
    expect(dirBin(Math.PI)).toBe(127);
    expect(dirBin(-Math.PI)).toBe(0);
    expect(dirBin(0)).toBe(64);
  });
  it("rose and excess-shear classes per bin match to 1e-12 (flat bed and crest modes, d = 50, 200, 1000 µm)", () => {
    let n = 0;
    for (const c of ROSE_FIXTURE.cells) {
      const s = seriesOf(c);
      for (const k of c.cases) {
        const r = marsFluxRoses(s, k.dUm, k.alpha);
        expect(r.nHours).toBe(k.nHours);
        for (let j = 0; j < 128; j++) { expect(rel(r.rose[j], k.rose[j])).toBeLessThan(1e-12); n++; }
        k.classes.forEach((row, ci) => row.forEach((v, j) => expect(rel(r.classes[ci][j], v)).toBeLessThan(1e-12)));
        const sum = r.classes.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
        expect(rel(sum, r.rose.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12);
      }
    }
    expect(n).toBe(3 * 9 * 128);
  });
  it("per-hour threshold statistics match (median / percentiles of u*,th, fraction above, validity)", () => {
    for (const c of ROSE_FIXTURE.cells) {
      const s = seriesOf(c);
      for (const k of c.cases.filter((x) => x.alpha === null)) {
        const t = thresholdStats(s, k.dUm);
        for (const key of ["utMedian", "utP05", "utP95", "fracAbove", "fracInvalid"] as const) expect(rel(t[key], k.stats[key])).toBeLessThan(1e-12);
        expect(t.fracInvalid).toBe(0); // Ga sqrt(s) > 81 for every hour (docs/reference/mars-spec.md section 3)
      }
    }
  });
  it("the panel view is the rose in m²/yr: sectors and the excess-shear stack sum to the same total", () => {
    const cell = makeMarsCell(0);
    for (const mode of ["flat", "elongation", "transverse"] as const) {
      const v = analyseMarsCell(cell, 29, { fluxSectors: 32, fluxMode: mode });
      const ref = marsFluxRoses(cell.series, 200, mode === "flat" ? null : mode === "elongation" ? Math.fround(0.3) : Math.fround(1.2)).rose.reduce((a, b) => a + b, 0) * M.S2Y;
      expect(rel(v.fluxTotal, ref)).toBeLessThan(1e-12);
      v.fluxStack.forEach((row, sct) => expect(rel(row.reduce((a, b) => a + b, 0), v.fluxSectors[sct])).toBeLessThan(1e-9));
      expect(v.fluxSectorsPct.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
      expect(v.ut).toBe(200);
      expect(v.windRose.freq.flat().reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
      expect(v.windRose.totalHours).toBe(cell.series.u.length - 3); // NaN wind, T = 0, z = 0
    }
  });
});
