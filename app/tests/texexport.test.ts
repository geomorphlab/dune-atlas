// @vitest-environment happy-dom
// Symbols in image exports drawn from TeX as SVG paths (MathJax SVG output, glyphs embedded, no
// font dependence): every TeX string of the registry / field metadata / panel renders; map and plot
// export SVGs contain math groups for their symbols and no raw TeX in visible text; the renderer is
// loaded lazily (not part of the main bundle).
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { loadRegistry } from "../src/registry/load";
import { createMathRenderer } from "../src/export/mathjax";
import { MATH_SCALE, richText, splitTex, unitsTex, wrapRich } from "../src/export/texsvg";
import { exportTitleTex, exportUnits, utTex } from "../src/export/labels";
import { mapStripSvg, type MapStripContext } from "../src/export/mapExport";
import { FLUX_MODES, MODE_STYLE } from "../src/cell/analysis";
import { PLOT_KEYS } from "../src/export/plotExport";
import { CellPanel } from "../src/ui/cellPanel";
import type { CellStore } from "../src/cell/cellstore";
import { texToPlain } from "../src/util/plaintext";
import { sampleCell } from "./publictext";
import { FIELD_VARS } from "./helpers";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });
const reg = loadRegistry().registry;
const math = createMathRenderer();
const mathSegs = (s: string | undefined) => (s ?? "").split("$").filter((_, k, a) => k % 2 === 1 && k < a.length - 1);
const META = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../registry/qsat_field_metadata.json"), "utf8")) as Record<string, Record<string, unknown>>;
/** visible text: the contents of <text> elements */
const visible = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const texOf = (svg: string) => [...svg.matchAll(/<g class="math[^"]*" data-tex="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

describe("TeX -> SVG paths", () => {
  it("every TeX string of the registry, the field metadata and the panel renders to paths", () => {
    const all = new Set<string>();
    for (const l of reg.layers) { for (const m of mathSegs(l.titleTex)) all.add(m); for (const m of mathSegs(exportTitleTex(l))) all.add(m); for (const m of mathSegs(exportUnits(l.units))) all.add(m); }
    for (const v of Object.values(META)) for (const val of Object.values(v)) if (typeof val === "string") for (const m of mathSegs(val)) all.add(m);
    for (const s of Object.values(MODE_STYLE)) for (const m of mathSegs(s.tex)) all.add(m);
    for (const f of FLUX_MODES) for (const m of mathSegs(f.totalTex)) all.add(m);
    for (const m of mathSegs(utTex(0.15) + unitsTex(" m²/yr m/kyr m/s m²/s") + "$u_{*f}/u_{*,th}$ $u_c/u_{*,th}$ $\\nabla\\cdot\\vec{q}_s$ $RDP/DP$")) all.add(m);
    expect(all.size).toBeGreaterThan(30);
    for (const tex of all) {
      const b = math.render(tex);
      expect(b.body, tex).toMatch(/<path /);
      expect(b.body, tex).not.toMatch(/<text|font-family|<use /); // glyphs embedded as paths
      expect(b.w, tex).toBeGreaterThan(0);
      expect(b.a + b.d, tex).toBeGreaterThan(0.3);
    }
  });
  it("layer export titles: the English title with its symbol in TeX, once", () => {
    const want: Record<string, string> = {
      dpm: "Drift potential ($DP$)", rdpm: "Resultant drift potential ($RDP$)", rdpa: "Resultant drift direction ($RDD$)",
      qha_rdp_dp: "Flux directionality ($RDP/DP$)", at: "Transverse migration direction ($\\alpha_T$)", ab: "Crest orientation, bed-instability mode ($\\alpha_H$)",
      qsdiv: "Saturated flux divergence ($\\nabla\\cdot\\vec{q}_s$)", aridity: "Aridity index ($\\mathrm{AI}$)", vegetation: "Total vegetation cover ($V$)",
      qacb: "Absolute across-crest flux, bed-instability mode $\\langle |Q_{\\bot}(\\alpha_H)|\\rangle$",
    };
    for (const [id, t] of Object.entries(want)) expect(exportTitleTex(reg.layers.find((l) => l.id === id)!), id).toBe(t);
    for (const l of reg.layers) {
      const t = exportTitleTex(l);
      expect(mathSegs(t).length, l.id).toBe(l.titleTex?.includes("$") ? 1 : 0);
      expect(t.split("$").filter((_, k) => k % 2 === 0).join(""), l.id).not.toMatch(/[αβσ∇⟨⟩∥⊥]/); // no leftover plain symbol
    }
  });
  it("formulas scale with the text (relative-size model) and keep their place in the line", () => {
    const a = richText("at $u_{*,th}$ = 0.15", 10, 50, 18, { fill: "#000", math });
    const sc = Number(a.match(/scale\(([\d.]+)\)/)![1]);
    expect(sc).toBeCloseTo((18 * MATH_SCALE) / 1000, 6);
    const xs = [...a.matchAll(/<text[^>]* x="([\d.]+)"/g)].map((m) => Number(m[1]));
    const gx = Number(a.match(/translate\(([\d.]+) /)![1]);
    expect(xs[0]).toBe(10);
    expect(gx).toBeGreaterThan(xs[0]);
    expect(xs[1]).toBeGreaterThan(gx);
    // a formula never breaks across lines
    expect(wrapRich("x $\\langle |Q_{\\bot}(\\alpha_H)|\\rangle$ y", 30, 18, { math }).flat().filter((g) => g.t === "math")).toHaveLength(1);
    // without a renderer: readable plain text
    expect(splitTex("at $u_{*,th}$", null)).toEqual([{ t: "text", s: "at u*,th" }]);
  });
});

const ctx = (on: string[]): MapStripContext => ({
  reg, width: 1300, includeBasemap: true, shareLink: "https://map.geomorphlab.org/#v=AQEBAg", date: new Date("2026-10-13T08:00:00Z"),
  view: { lon: 15.25, lat: -24.5, zoom: 6.2, bearing: 0, pitch: 0, proj: "globe" },
  state: { layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: on.includes(l.id), opacity: 1, ...(l.id === "rdpa" ? { cfg: { mode: "arrows" } } : {}) }])) as never, order: reg.layers.map((l) => l.id), dataset: "era5-land", utIndex: 14, basemap: "openfreemap-dark" } as never,
});

describe("exports contain math groups and no raw TeX in visible text", () => {
  it("map strip (all raster layers, vectors): symbols, units and the threshold as paths; rasterises", () => {
    const on = ["dpm", "rdpm", "qha_rdp_dp", "at", "qsdiv", "aridity", "vegetation", "uft", "rdpa", "dunes"];
    const { svg } = mapStripSvg(ctx(on), 1950, math);
    const tex = texOf(svg);
    for (const t of ["DP", "RDP", "RDP/DP", "\\alpha_T", "\\nabla\\cdot\\vec{q}_s", "\\mathrm{AI}", "V", "u_{*,th}", "RDD", "\\mathrm{m^{2}\\,yr^{-1}}", "\\mathrm{m\\,s^{-1}}", "\\mathrm{m\\,kyr^{-1}}"]) expect(tex, t).toContain(t);
    const vis = visible(svg);
    expect(vis).not.toMatch(/\$|\\[a-zA-Z]/);
    expect(vis).not.toMatch(/u\*,th|m²\/yr/); // the plain fallbacks are not used
    const img = new Resvg(svg, { font: { loadSystemFonts: true }, background: "rgba(0,0,0,0)" }).render();
    expect(img.width).toBe(1950);
  });
  it("plot exports (PNG / SVG source): axis labels, legends, titles, captions with math groups", async () => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const cell = sampleCell();
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, shareLink: () => "https://map.geomorphlab.org/#v=AQEBAg",
      exportMeta: () => ({ datasetId: "era5-land", datasetTitle: "ERA5-Land 0.1°, 1950–2024", dataVersion: "v1", permalink: "x" }) });
    await p.show({ query: async () => cell, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, cell.iy, cell.ix);
    const want: Record<string, string[]> = {
      "wind-rose": ["\\mathrm{m\\,s^{-1}}"],
      "flux-rose": ["u_{*f}" /* caption, from the on-screen KaTeX source */, "DP", "RDP", "RDP/DP", "RDD", "u_{*f}/u_{*,th}", "u_{*,th}", "\\alpha_H", "\\alpha_E", "\\alpha_T"],
      modes: ["\\alpha_T", "\\alpha_E", "\\alpha_O", "\\alpha_H", "RDD", "u_{*,th}"],
      qsdiv: ["DP", "u_{*,th}", "\\mathrm{m^{2}\\,yr^{-1}}"],   // the quantity plot, DP by default
    };
    for (const k of PLOT_KEYS) {
      const x = p.plotExport(k, 1600, math)!;
      const tex = texOf(x.svg);
      for (const t of want[k]) expect(tex, `${k}: ${t}`).toContain(t);
      expect(visible(x.svg), k).not.toMatch(/\$|\\[a-zA-Z]/);
      // math inside the plot itself (axis label), not only in the strip
      const plotPart = x.svg.slice(0, x.svg.indexOf('<svg x="0" y="'));
      if (k === "modes" || k === "qsdiv") expect(texOf(plotPart).length, k).toBeGreaterThan(0); // radius / axis labels
      const img = new Resvg(x.svg, { font: { loadSystemFonts: true }, background: "rgba(0,0,0,0)" }).render();
      expect(img.width).toBe(1600);
    }
  });
});

describe("lazy loading: MathJax is not in the main bundle", () => {
  it("only src/export/mathjax.ts imports mathjax-full, and it is only imported dynamically", () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.ts$/.test(f)) files.push(f); } };
    walk(path.resolve(__dirname, "../src"));
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      if (!f.endsWith(path.join("export", "mathjax.ts"))) expect(src, f).not.toMatch(/from\s+["']mathjax-full/);
      expect(src, f).not.toMatch(/import\s*(\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*from\s*["']\.\.?\/(export\/)?mathjax["']/);
    }
    expect(fs.readFileSync(path.resolve(__dirname, "../src/export/texsvg.ts"), "utf8")).toMatch(/import\("\.\/mathjax"\)/);
  });
});
