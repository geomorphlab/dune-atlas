// @vitest-environment happy-dom
// Aridity + flux-divergence layers, layer attribution, cells-aux reader, panel rows and downloads.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as zarr from "zarrita";
import { loadRegistry } from "../src/registry/load";
import { validateRegistry } from "../src/registry/validate";
import schema from "../../registry/layers.schema.json";
import { infoHtml, attributionHtml } from "../src/ui/layerPanel";
import { legendHtml, legendTicks } from "../src/ui/legend";
import { COLORMAPS } from "../src/util/colormaps";
import { CellStore, CellAuxStore, type CellData } from "../src/cell/cellstore";
import { cellNetcdf, fieldsByThresholdCsv, metadataJson } from "../src/cell/export";
import { aridityClass, AUX_META } from "../src/cell/auxinfo";
import { linePlotSvg } from "../src/cell/lineplot";
import { PANEL_SECTIONS, CellPanel } from "../src/ui/cellPanel";
import { makeCell, FIELD_VARS } from "./helpers";
import { C } from "../src/util/constants";
import { fmtNum } from "../src/util/format";
import katex from "katex";

const { registry: reg } = loadRegistry();
const L = (id: string) => reg.layers.find((l) => l.id === id)!;

describe("registry: aridity and qsdiv", () => {
  it("validates; group order dunes ... wind, drift, climate; qsdiv after the drift fields", () => {
    expect(validateRegistry(reg, schema)).toEqual([]);
    const gids = reg.groups.map((g) => g.id);
    expect(gids.slice(-3)).toEqual(["wind", "drift", "climate"]);
    expect(gids[0]).toBe("dunes");
    expect(gids).not.toContain("derived");
    const drift = reg.layers.filter((l) => l.group === "drift").map((l) => l.id);
    expect(drift[drift.length - 1]).toBe("qsdiv");
    expect(drift.indexOf("dpm")).toBeGreaterThanOrEqual(0);
    expect(L("aridity").group).toBe("climate");
  });
  it("aridity: 2-D, threshold-independent, log BrBG [0.003, 6.5]; qsdiv: PiYG ±0.3 m/kyr, threshold-aware", () => {
    const a = L("aridity"), q = L("qsdiv");
    expect(a.thresholdAware).toBe(false);
    expect(a.display).toMatchObject({ colormap: "brbg", clim: [0.003, 6.5], log: true, ticks: [0.03, 0.2, 0.5, 0.65], topLabel: "≥ 6.5" });
    expect(q.thresholdAware).toBe(true);
    expect(q.display).toMatchObject({ colormap: "piyg", clim: [-0.3, 0.3], transform: "scale", scale: 1000 });
    expect(q.titleTex).toBe("$\\nabla\\cdot\\vec{q}_s$");
    expect(() => katex.renderToString(q.titleTex!.slice(1, -1), { throwOnError: true })).not.toThrow();
    expect(q.description).toMatch(/following Gunn \(2026\), Methods M6/);
    expect(q.description).toMatch(/No data at coasts/);
  });
  it("PiYG colormap: negative end pink, positive end green", () => {
    const c = COLORMAPS.piyg;
    expect(c.length).toBe(256);
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [r0, g0] = rgb(c[0]), [r1, g1] = rgb(c[255]);
    expect(r0).toBeGreaterThan(g0);
    expect(g1).toBeGreaterThan(r1);
  });
});

describe("About: data sources", () => {
  it("lists the aridity source and the flux-divergence derivation; cites Global-AI", async () => {
    const { renderLayerPanel } = await import("../src/ui/layerPanel");
    const { Store } = await import("../src/store");
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const root = document.getElementById("layer-panel")!;
    const layers = Object.fromEntries(reg.layers.map((l) => [l.id, { visible: false, opacity: 1 }]));
    renderLayerPanel(root, reg, new Store({ basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers, order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false } as never));
    const about = root.querySelector("details.about")!;
    expect(about.querySelector("summary")!.textContent).toBe("About, data sources & citation");
    expect(about.textContent).toMatch(/Aridity index: Global Aridity Index v3\.1/);
    expect(about.textContent).toMatch(/Methods M6/);
    expect(about.textContent).toMatch(/following Gunn \(2026\), Methods M6/);
    expect(about.innerHTML).toContain("10.6084/m9.figshare.7504448.v7");
  });
});

describe("info popover and legend", () => {
  it("attribution (source, citation, DOI link, licence, link, changes) and threshold note", () => {
    const html = infoHtml(L("aridity"));
    expect(html).toMatch(/Threshold-independent/);
    for (const k of ["Source", "Citation", "Data DOI", "Licence", "Link", "Changes"]) expect(html).toContain(`<dt>${k}</dt>`);
    expect(html).toContain('href="https://doi.org/10.6084/m9.figshare.7504448.v7"');
    expect(html).toContain("CC BY 4.0");
    expect(infoHtml(L("qsdiv"))).toMatch(/Updates with the/);
    expect(attributionHtml({ url: "javascript:alert(1)", source: "<b>x</b>" })).not.toMatch(/javascript:|<b>/);
  });
  it("aridity legend: UNEP class ticks, saturated top label, note on saturation and Antarctica", () => {
    const a = L("aridity");
    expect(legendTicks(a)).toEqual([0.003, 0.03, 0.2, 0.5, 0.65, 6.5]);
    const h = legendHtml(a);
    expect(h).toContain(">≥ 6.5<");
    expect(h).toMatch(/AI ≥ 6\.5 \(source values saturate at 6\.5535\)/);
    expect(h).toMatch(/Antarctica \(south of 60° S\)/);
    expect(h).toContain('class="legend-ticks staggered"'); // 0.5 / 0.65 are close on the log scale
    expect((h.match(/<i style=/g) ?? []).length).toBe(4);
    // a user clim replaces the class ticks
    expect(legendTicks(a, { clim: [0.01, 1] })).not.toContain(0.65);
  });
});

const fixture = path.resolve(__dirname, "../../staging/fixture");
const haveAux = fs.existsSync(path.join(fixture, "cells-aux.zarr", "zarr.json"));
class RangeFileStore {
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

describe.skipIf(!haveAux)("cells-aux.zarr reader (fixture subset)", () => {
  it("query returns qsdiv[64] and the aridity scalars, equal to direct reads; ocean = NaN; missing store = no aux", async () => {
    const auxS = new RangeFileStore(path.join(fixture, "cells-aux.zarr"));
    const cs = await CellStore.open(new RangeFileStore(path.join(fixture, "cells.zarr")), { aux: auxS });
    const c = await cs.query(1145, 1952);
    expect(c.aux).toBeDefined();
    expect(c.aux!.series.qsdiv.length).toBe(64);
    const q = await zarr.open.v3(zarr.root(auxS as never).resolve("qsdiv"), { kind: "array" });
    const ref = await zarr.get(q, [1145, 1952, null]);
    expect(Array.from(c.aux!.series.qsdiv)).toEqual(Array.from((ref as { data: Float32Array }).data));
    for (const v of ["ai_mean", "ai_valid_frac", "ai_sat_frac"]) {
      const a = await zarr.open.v3(zarr.root(auxS as never).resolve(v), { kind: "array" });
      const r = Number(await zarr.get(a, [1145, 1952]));
      expect(c.aux!.scalars[v]).toBe(r);
    }
    expect(c.aux!.scalars.ai_mean).toBeGreaterThan(0);
    expect(c.aux!.scalars.ai_mean).toBeLessThan(0.2); // Namib: arid
    expect(c.aux!.attrs.ai_mean.licence).toBe("CC BY 4.0");
    const ocean = await cs.query(1100, 1904);
    expect(Number.isNaN(ocean.aux!.scalars.ai_mean)).toBe(true);
    expect(Array.from(ocean.aux!.series.qsdiv).every(Number.isNaN)).toBe(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const noAux = await CellStore.open(new RangeFileStore(path.join(fixture, "cells.zarr")), { aux: new RangeFileStore(path.join(fixture, "nope.zarr")) });
    expect((await noAux.query(1145, 1952)).aux).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    expect((await CellAuxStore.open(auxS)).variables.sort()).toEqual(["ai_mean", "ai_sat_frac", "ai_valid_frac", "qsdiv"]);
  });
});

function auxCell(sat = 0.25): CellData {
  const hist = new Uint32Array(128 * 128); hist[40 * 128 + 70] = 100; hist[90 * 128 + 10] = 50;
  const fields = new Float32Array(FIELD_VARS.length * 64).fill(0.3);
  const c = makeCell({ iy: 1145, ix: 1952, lat: -24.5, lon: 15.2, hist, fields });
  c.aux = {
    series: { qsdiv: Float32Array.from({ length: 64 }, (_, k) => (k === 3 ? NaN : -1e-4 + k * 3e-6)) },
    scalars: { ai_mean: 0.05, ai_valid_frac: 1, ai_sat_frac: sat },
    attrs: { qsdiv: { description: "Divergence on the sphere, div q = 1/(R cos φ)[...].", licence: "CC BY 4.0" }, ai_mean: { source: "Global-AI_PET v3.1", citation: "Zomer et al. (2022)", doi: "10.6084/m9.figshare.7504448.v7", licence: "CC BY 4.0", changes: "resampled" } },
  };
  return c;
}

describe("panel and downloads with cells-aux values", () => {
  it("summary table: qsdiv at the current threshold (m/kyr), AI with class, valid / saturated fractions and ≥", async () => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const c = auxCell();
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {} });
    await p.show({ query: async () => c, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, 1145, 1952);
    const row = (v: string) => root.querySelector(`.summary tr[data-field="${v}"]`)!;
    expect(row("qsdiv").querySelector("td.num")!.textContent!.replace(/\u00a0/g, " ")).toBe(`${fmtNum(Math.fround(-1e-4 + 14 * 3e-6) * 1000)} m/kyr`);
    expect(row("qsdiv").querySelector("td.num")!.textContent!.replace(/\u00a0/g, " ")).toMatch(/^-0\.058\d* m\/kyr$/);
    expect(row("ai_mean").querySelector("td.num")!.textContent).toBe("≥ 0.050 (arid)");
    expect(row("ai_mean").querySelector("th")!.textContent).toBe("Aridity index");               // terse label (round 5)
    expect(row("ai_mean").querySelector("th")!.getAttribute("title")).toMatch(/100 % of cell valid, 25 % saturated/);
    expect(root.querySelector("details.qsdiv svg.line-plot")).not.toBeNull();
    // all six sections, in order, each a disclosure with its h3 in the summary
    expect([...root.querySelectorAll(".cell-body details.section")].map((d) => (d as HTMLElement).dataset.section)).toEqual([...PANEL_SECTIONS]);
    const qd = root.querySelector('details[data-section="qsdiv"]') as HTMLDetailsElement;
    expect(qd.open).toBe(true);
    expect(qd.querySelector(":scope > summary > h3")!.textContent!.replace(/\s+/g, " ")).toMatch(/^Flux divergence .* vs threshold$/);
    p.setThreshold(3);
    expect(row("qsdiv").querySelector("td.num")!.textContent).toBe("—");
    expect(aridityClass(0.02)).toBe("hyper-arid");
    expect(aridityClass(0.7)).toBe("humid");
  });
  it("NetCDF: qsdiv(ut) m yr-1 and ai_* scalars with source attrs; CSV qsdiv column; metadata.json aux", () => {
    const c = auxCell(0);
    const nc = cellNetcdf(c, { datasetId: "era5-land", datasetTitle: "ERA5-Land", dataVersion: "v1", permalink: "x", generated: new Date(0) });
    const txt = new TextDecoder("latin1").decode(nc);
    for (const v of ["qsdiv", "ai_mean", "ai_valid_frac", "ai_sat_frac"]) expect(txt).toContain(v);
    expect(txt).toContain("m yr-1");
    expect(txt).toContain("10.6084/m9.figshare.7504448.v7");
    const fb = fieldsByThresholdCsv(c).split("\n");
    expect(fb[0].split(",").slice(-1)[0]).toBe("flux_divergence");          // qsdiv (CSV header)
    expect(fb[1 + 3].split(",").slice(-1)[0]).toBe(""); // NaN
    const md = JSON.parse(metadataJson(c, { datasetId: "era5-land", datasetTitle: "ERA5-Land", dataVersion: "v1", permalink: "x" }));
    expect(md.aux.ai_mean).toMatchObject({ value: 0.05, units: "1", license: "CC BY 4.0" });
    expect(md.aux.qsdiv.in_file).toBe("fields_by_threshold.csv");
    for (const v of Object.keys(AUX_META)) expect(() => katex.renderToString(AUX_META[v].symbolTex, { throwOnError: true })).not.toThrow();
  });
  it("line plot: breaks at NaN, zero line, current marker", () => {
    const svg = linePlotSvg({ x: C.UT_VALUES, y: C.UT_VALUES.map((u, k) => (k === 10 ? NaN : u - 0.3)), currentIndex: 14, xLabel: "u", yLabel: "y", title: "t" });
    expect((svg.match(/<polyline/g) ?? []).length).toBe(2);
    expect(svg).toContain('class="current"');
  });
});
