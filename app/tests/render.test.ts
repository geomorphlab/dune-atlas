// SVG/legend/tex/download builders: structural checks (no browser).
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/flux-parity.json";
import { roseSvg, niceTicks, SPEED_COLORS, windRoseData } from "../src/cell/roses";
import { modesPlotSvg, continuousRuns } from "../src/cell/modesplot";
import { texToHtml, texToText } from "../src/util/tex";
import { citationFile } from "../src/cell/downloads";
import { analyseCell } from "../src/cell/analysis";
import { dpRdpRdd, fluxRose } from "../src/cell/flux";
import { fragmentFor, displayExpr } from "../src/map/shader";
import { legendHtml, legendTicks } from "../src/ui/legend";
import { C } from "../src/util/constants";
import type { CellData } from "../src/cell/cellstore";
import { makeCell, FIELD_VARS } from "./helpers";
import meta from "../../registry/qsat_field_metadata.json";

function fakeCell(): CellData {
  const c = (fixture as unknown as { cells: { iy: number; ix: number; lat: number; lon: number; hist_idx: number[]; hist_cnt: number[] }[] }).cells[1];
  const hist = new Uint32Array(16384);
  c.hist_idx.forEach((k, i) => (hist[k] = c.hist_cnt[i]));
  const fields = new Float32Array(FIELD_VARS.length * 64).map((_, i) => 0.5 + (i % 64) / 100);
  return makeCell({ iy: c.iy, ix: c.ix, lat: c.lat, lon: c.lon, hist, fields });
}

describe("tex", () => {
  it("converts the source long names", () => {
    expect(texToHtml("$\\langle |Q_{\\bot}(\\alpha_E)|\\rangle$")).toBe("⟨ |Q<sub>⊥</sub>(α<sub>E</sub>)|⟩".replace(" ", ""));
    expect(texToHtml("m$^2$/s")).toBe("m<sup>2</sup>/s");
    expect(texToHtml("$\\hat{Q}_{|\\bot|/\\parallel,E}$")).toBe("Q̂<sub>|⊥|/∥,E</sub>");
    expect(texToText("$u_{\\ast,th}$")).toBe("u_*,th");
    expect(texToHtml("a < b & c")).toBe("a &lt; b &amp; c");
  });
  it("handles every long name in qsat_field_metadata.json without leftover backslashes", () => {
    for (const v of Object.values(meta as Record<string, { long_name: string; units: string }>)) {
      expect(texToHtml(v.long_name)).not.toMatch(/\\|\$/);
      expect(texToHtml(v.units)).not.toMatch(/\\|\$/);
    }
  });
});

describe("roses and plots", () => {
  const cell = fakeCell();
  const v = analyseCell(cell, 14);
  it("wind rose SVG has one path per non-empty stacked petal and accessible title", () => {
    const svg = roseSvg({ id: "w", values: v.windRose.freq, colors: SPEED_COLORS, title: "Wind rose", desc: "d", ringFormat: (x) => `${x}%` });
    const nonEmpty = v.windRose.freq.flat().filter((x) => x > 0).length;
    expect((svg.match(/<path d=/g) ?? []).length).toBe(nonEmpty);
    expect(svg).toContain('<title id="w-t">Wind rose</title>');
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toContain("NaN");
  });
  it("flux rose arrows: axis draws both ends, NaN bearings skipped", () => {
    const svg = roseSvg({ id: "f", values: v.fluxSectors.map((x) => [x]), colors: ["#000"], title: "f", desc: "", ringFormat: String,
      arrows: [{ bearing: 30, color: "#f00", label: "ax", axis: true }, { bearing: NaN, color: "#0f0", label: "nan" }, { bearing: 200, color: "#00f", label: "a" }] });
    expect((svg.match(/class="rose-arrow"/g) ?? []).length).toBe(2);
    expect(svg).not.toContain("NaN");
  });
  it("polar modes plot: one continuous trace across 360/0, broken at a real reversal; axis drawn both ways", () => {
    const wrap = C.UT_VALUES.map((_, k) => (k < 32 ? 350 + k * 0.5 : 5 + (k - 32) * 0.1)); // 350 -> 365.5 -> 5: continuous
    expect(continuousRuns(wrap, false).length).toBe(1);
    const flip = C.UT_VALUES.map((_, k) => (k < 32 ? 60 : 240)); // reversal
    expect(continuousRuns(flip, false).length).toBe(2);
    const axis = C.UT_VALUES.map((_, k) => (k < 32 ? 178 : 2)); // axis 178 ~ 2 (period 180): continuous
    expect(continuousRuns(axis, true).length).toBe(1);
    const svg = modesPlotSvg({ x: C.UT_VALUES, currentIndex: 14, series: [
      { label: "dir", color: "#f00", values: flip },
      { label: "axis", color: "#0f0", values: axis, axis: true },
    ] });
    expect((svg.match(/<path /g) ?? []).length).toBe(2 + 2); // 2 runs + axis both ways
    expect((svg.match(/class="current-mode"/g) ?? []).length).toBe(1 + 2);
    expect(svg).toContain('class="current-ut"');
    expect(svg).not.toContain("NaN");
  });
  it("polar radius: first threshold at the centre, last at the rim", () => {
    const svg = modesPlotSvg({ x: C.UT_VALUES, currentIndex: 0, size: 200, series: [{ label: "n", color: "#fff", values: C.UT_VALUES.map(() => 0) }] });
    expect(svg).toMatch(/class="current-mode" cx="100" cy="100"/);
  });
  it("rose sectors are gapless (each wedge spans 360/n)", () => {
    const n = 8;
    const svg = roseSvg({ id: "g", values: Array.from({ length: n }, () => [1]), colors: ["#fff"], title: "t", desc: "", ringFormat: String });
    // wedge 0 (centred on N) starts at bearing -22.5 and ends at +22.5 on the outer ring
    const d = /<path d="M([^"]+)" fill/.exec(svg)![1];
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const [cx, cy] = [130, 130];
    const R = 130 - 22;
    const ang = (x: number, y: number) => (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
    expect(ang(nums[2], nums[3])).toBeCloseTo(-22.5, 1);
    expect(ang(nums[9], nums[10])).toBeCloseTo(22.5, 1);
    expect(Math.hypot(nums[2] - cx, nums[3] - cy)).toBeCloseTo(R, 0);
  });
  it("flux rose percentages sum to 100 and match the m2/yr sectors", () => {
    for (const n of [8, 16, 64, 128]) {
      const vv = analyseCell(cell, 14, { fluxSectors: n });
      expect(vv.fluxSectorsPct.length).toBe(n);
      expect(vv.fluxSectorsPct.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
      const tot = vv.fluxSectors.reduce((a, b) => a + b, 0);
      vv.fluxSectors.forEach((x, i) => expect(vv.fluxSectorsPct[i]).toBeCloseTo((100 * x) / tot, 9));
    }
  });
  it("niceTicks", () => {
    expect(niceTicks(7.3, 3)).toEqual([2.5, 5, 7.5]);
    expect(niceTicks(5, 3)).toEqual([2, 4, 6]);
    expect(niceTicks(0)).toEqual([]);
  });
  it("flux rose petals are the time-averaged rose (flux.py flux_rose) in m2/yr", () => {
    const tw = fluxRose(cell.hist, C.UT_VALUES[14]);
    v.fluxPerBin.forEach((x, j) => expect(x).toBeCloseTo(tw[j] * C.S2Y, 12));
    const total = v.fluxSectors.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(dpRdpRdd(cell.hist, C.UT_VALUES[14]).dp * C.S2Y, 9);
  });
  it("wind rose of the fixture cell sums to 100 %", () => {
    const wr = windRoseData(cell.hist);
    expect(wr.freq.flat().reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });
});

describe("downloads", () => {
  const cell = fakeCell();
  it("citation text contains both DOIs and the C3S notice", () => {
    const t = citationFile(cell);
    expect(t).toContain("10.1038/s41467-026-75466-y");
    expect(t).toContain("10.5281/zenodo.20046812");
    expect(t).toContain("Contains modified Copernicus Climate Change Service information");
  });
});

describe("zarr-field shaders and legends", () => {
  it("rad-to-bearing shader maps math angle to compass bearing", () => {
    expect(displayExpr("at", { transform: "rad-to-bearing" })).toBe("mod(90.0 - degrees(at), 360.0)");
    expect(fragmentFor("qacb", { transform: "none" })).toBeUndefined();
    expect(fragmentFor("qacb", { log: true, clim: [0.1, 200] })).toContain("log(clim.y)");
    expect(displayExpr("a-b", { transform: "scale", scale: 2 })).toBe("(a_b * 2.0)");
  });
  it("legend ticks", () => {
    const l = { id: "x", title: "x", group: "g", type: "zarr-field" as const, source: "s", display: { log: true, clim: [0.1, 200] as [number, number], colormap: "magma" } };
    expect(legendTicks(l)).toEqual([0.1, 1, 10, 100, 200]);
    expect(legendHtml(l)).toContain("linear-gradient");
  });
});
