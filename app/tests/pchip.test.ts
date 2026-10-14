import { describe, expect, it } from "vitest";
import { pchipDense, pchipSlopes, unwrapDeg } from "../src/core/util/pchip";
import { modesPlotSvg } from "../src/core/cell/modesplot";
import { linePlotSvg } from "../src/core/cell/lineplot";
import { C } from "../src/core/util/constants";

describe("PCHIP smoothing", () => {
  const x = [0.01, 0.05, 0.1, 0.2, 0.25, 0.4, 0.64];
  const y = [3, 3.5, 7, 7.2, 1, -2, -2];
  it("passes through every data point exactly", () => {
    const d = pchipDense(x, y, 8);
    x.forEach((xi, k) => { expect(d.x[8 * k]).toBe(xi); expect(d.y[8 * k]).toBe(y[k]); });
    expect(d.x.length).toBe(8 * (x.length - 1) + 1);
  });
  it("monotone between monotone neighbours; flat at extrema and plateaus; no overshoot", () => {
    const d = pchipDense(x, y, 16);
    for (let k = 0; k < x.length - 1; k++) {
      const seg = d.y.slice(16 * k, 16 * (k + 1) + 1);
      const lo = Math.min(y[k], y[k + 1]), hi = Math.max(y[k], y[k + 1]);
      for (const v of seg) { expect(v).toBeGreaterThanOrEqual(lo - 1e-12); expect(v).toBeLessThanOrEqual(hi + 1e-12); }
      const inc = y[k + 1] >= y[k];
      for (let j = 1; j < seg.length; j++) expect(inc ? seg[j] >= seg[j - 1] - 1e-12 : seg[j] <= seg[j - 1] + 1e-12).toBe(true);
    }
    const s = pchipSlopes(x, y);
    expect(s[3]).toBe(0); // local maximum at 0.2 (7 < 7.2 > 1)
    expect(s[6]).toBe(0); // end plateau
    // monotone data -> monotone curve; linear data reproduced
    const lin = pchipDense([0, 1, 2, 3], [0, 2, 4, 6], 4);
    lin.x.forEach((u, i) => expect(lin.y[i]).toBeCloseTo(2 * u, 12));
    expect(pchipDense([0, 1], [5, 7], 4).y).toEqual([5, 5.5, 6, 6.5, 7]);
  });
  it("angles are unwrapped before interpolation (no sweep the long way round)", () => {
    expect(unwrapDeg([350, 355, 5, 15])).toEqual([350, 355, 365, 375]);
    expect(unwrapDeg([10, 350])).toEqual([10, -10]);
  });
  it("modes plot: smooth paths through every data point; a NaN gap breaks the trace", () => {
    const vals = C.UT_VALUES.map((u, k) => (k === 30 ? NaN : 350 + 40 * u));
    const svg = modesPlotSvg({ x: C.UT_VALUES, currentIndex: 14, series: [{ label: "a", color: "#fff", values: vals }] });
    const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBe(2);
    expect((paths[0].match(/L/g) ?? []).length).toBe(8 * (30 - 1)); // 30 points -> 29 intervals x 8
  });
  it("line plot: smooth polyline per run, broken at NaN", () => {
    const y = C.UT_VALUES.map((u, k) => (k === 10 ? NaN : Math.sin(10 * u)));
    const svg = linePlotSvg({ x: C.UT_VALUES, y, currentIndex: 14, xLabel: "u", yLabel: "y", title: "t" });
    const polys = [...svg.matchAll(/<polyline points="([^"]+)"/g)].map((m) => m[1].split(" ").length);
    expect(polys).toEqual([8 * 9 + 1, 8 * (64 - 11 - 1) + 1]);
  });
});
