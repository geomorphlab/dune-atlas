// @vitest-environment happy-dom
// Export layout rules (author feedback): one output size (map: clamp(on-screen width x 1.5, 1600,
// 2400) px; plots: 1600 px) tagged 300 dpi (pHYs); text, colour bars and lines sized RELATIVE to
// the image width W (body ~0.018 W ~ 17 pt and heading ~0.024 W ~ 23 pt when the image fills a
// 13.33 in slide); colour bars 0.28 W x 0.022 W, 3 per row, wrapping; no redundant style text on
// colour bars; no grid row / column in exported text; no halo on rose tick labels; a full-width
// separator padded from the image; all text below the image. Text keeps its aspect: the strip spans
// the canvas's ACTUAL width with one factor on both axes.
import { describe, expect, it, vi } from "vitest";
import zlib from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import { loadRegistry } from "../src/registry/load";
import { mapStripItems, mapStripSvg, type MapStripContext } from "../src/export/mapExport";
import { COLORBAR, colorbarsPerRow, slidePt, STRIP_FS, STRIP_PAD, STRIP_REL, STRIP_UNITS, stripSvg } from "../src/export/strip";
import { dpiToPpm, EXPORT_DPI, mapExportPixelRatio, mapExportWidth, PLOT_EXPORT_WIDTH, readPngPhys, setPngDpi, stripPlacement } from "../src/export/png";
import { PLOT_KEYS } from "../src/export/plotExport";
import { CellPanel } from "../src/ui/cellPanel";
import type { CellStore } from "../src/cell/cellstore";
import { EXPORT_TEXT, HELP_SECTIONS } from "../src/ui/helpText";
import { sampleCell } from "./publictext";
import { FIELD_VARS } from "./helpers";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });
const reg = loadRegistry().registry;
const RASTERS = ["dpm", "at", "uft", "aridity", "vegetation", "qsdiv"].filter((id) => reg.layers.some((l) => l.id === id));
const ctx = (width: number, on: string[], extra: Record<string, object> = {}): MapStripContext => ({
  reg, width, includeBasemap: true, shareLink: "https://map.geomorphlab.org/#v=AQEBAg", date: new Date("2026-10-13T08:00:00Z"),
  view: { lon: 15.25, lat: -24.5, zoom: 6.2, bearing: 0, pitch: 0, proj: "globe" },
  state: { layers: Object.fromEntries(reg.layers.map((l) => [l.id, on.includes(l.id) ? { visible: true, opacity: 1, ...(extra[l.id] ?? {}) } : { visible: false, opacity: 1 }])) as never, order: reg.layers.map((l) => l.id), dataset: "era5-land", utIndex: 14 } as never,
});
const els = (svg: string, cls: string) => [...svg.matchAll(new RegExp(`<(\\w+) class="${cls}"([^>]*)>`, "g"))].map((m) => {
  const a = (n: string) => Number((m[2].match(new RegExp(` ${n}="([-\\d.]+)"`)) ?? [])[1]);
  return { x: a("x"), y: a("y"), w: a("width"), h: a("height"), x1: a("x1"), x2: a("x2"), y1: a("y1"), cy: a("cy") };
});
const svgText = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const openPanel = async () => {
  document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
  const root = document.getElementById("cell-panel")!;
  const cell = sampleCell();
  const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, shareLink: () => "https://map.geomorphlab.org/#v=AQEBAg",
    exportMeta: () => ({ datasetId: "era5-land", datasetTitle: "ERA5-Land 0.1°, 1950–2024", dataVersion: "v1", permalink: "x" }) });
  await p.show({ query: async () => cell, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, cell.iy, cell.ix);
  return { p, root };
};

describe("one output size, tagged 300 dpi", () => {
  it("map width = clamp(on-screen width x 1.5, 1600, 2400) px; plots 1600 px", () => {
    for (const [css, w] of [[400, 1600], [1000, 1600], [1066, 1600], [1300, 1950], [1440, 2160], [1600, 2400], [2560, 2400]] as const) {
      expect(mapExportWidth(css), `${css}`).toBe(w);
      expect(mapExportPixelRatio(css) * css).toBeCloseTo(w, 9);
    }
    expect(PLOT_EXPORT_WIDTH).toBeGreaterThanOrEqual(1500);
    expect(PLOT_EXPORT_WIDTH).toBeLessThanOrEqual(1800);
  });
  it("pHYs 11811 px/m = 300 dpi (unit metre) directly after IHDR; CRC valid; image data untouched", () => {
    expect(EXPORT_DPI).toBe(300);
    expect(dpiToPpm(300)).toBe(11811);
    const png = new Uint8Array(new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="20" height="20" fill="#c08040"/></svg>').render().asPng());
    expect(readPngPhys(png)).toBeNull();
    const out = setPngDpi(png, 300);
    expect(readPngPhys(out)).toEqual([11811, 11811, 1]);
    const chunks: { type: string; data: Uint8Array; crc: number }[] = [];
    const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
    for (let o = 8; o < out.length;) {
      const len = dv.getUint32(o), type = String.fromCharCode(...out.subarray(o + 4, o + 8));
      chunks.push({ type, data: out.subarray(o + 8, o + 8 + len), crc: dv.getUint32(o + 8 + len) });
      if ("crc32" in zlib) expect((zlib as unknown as { crc32: (b: Uint8Array) => number }).crc32(out.subarray(o + 4, o + 8 + len)), type).toBe(dv.getUint32(o + 8 + len));
      o += 12 + len;
    }
    expect(chunks.slice(0, 2).map((c) => c.type)).toEqual(["IHDR", "pHYs"]);
    expect(chunks.filter((c) => c.type === "pHYs")).toHaveLength(1);
    const idat = (b: Uint8Array) => Buffer.from(b).toString("hex").split("49444154")[1];
    expect(idat(out)).toBe(idat(png));
    // replacing (not duplicating) an existing pHYs
    const again = setPngDpi(out, 150);
    expect(readPngPhys(again)).toEqual([5906, 5906, 1]);
    expect(Buffer.from(again).toString("latin1").split("pHYs").length - 1).toBe(1);
  });
  it("the UI offers one size only (map: one button; plots: PNG and SVG); SVG and PNG have the same proportions", async () => {
    expect(EXPORT_TEXT.run).toBe("Export PNG");
    const help = HELP_SECTIONS.map((s) => s.body).join(" ");
    expect(help).toMatch(/1600–2400 pixels wide/);
    expect(help).not.toMatch(/2×|\b2x\b|300 dpi/);
    const { p, root } = await openPanel();
    for (const m of root.querySelectorAll(".export-menu")) expect([...m.querySelectorAll("button")].map((b) => b.textContent)).toEqual([EXPORT_TEXT.png, EXPORT_TEXT.svg]);
    for (const k of PLOT_KEYS) {
      const x = p.plotExport(k)!;
      expect(x.pxWidth).toBe(PLOT_EXPORT_WIDTH);
      expect(x.width).toBe(STRIP_UNITS);
      expect(x.svg).toMatch(new RegExp(`^<svg[^>]* width="${PLOT_EXPORT_WIDTH}" height="${+x.pxHeight.toFixed(3)}" viewBox="0 0 ${STRIP_UNITS} ${+x.height.toFixed(3)}"`));
      expect(x.pxHeight / x.pxWidth).toBeCloseTo(x.height / x.width, 9);
    }
  });
});

describe("aspect-correct text: the strip spans the canvas's actual width, one factor on both axes", () => {
  it("normal and clamped canvases: placement width = canvas width, height = strip height x the same factor", () => {
    const cssW = 1300, cssH = 900, items = mapStripItems(ctx(cssW, ["dpm", "aridity"]));
    const W = mapExportWidth(cssW), r = mapExportPixelRatio(cssW);
    for (const canvas of [{ width: W, height: cssH * r }, { width: 1500, height: 1038 } /* clamped */, { width: cssW, height: cssH }]) {
      const strip = stripSvg(items, { pxWidth: canvas.width });
      const pl = stripPlacement(canvas, strip);
      expect(pl.scale).toBeCloseTo(canvas.width / STRIP_UNITS, 12);
      expect(pl.y).toBe(canvas.height);
      expect(pl.width).toBe(canvas.width);
      expect(Math.abs(pl.height - strip.pxHeight)).toBeLessThanOrEqual(0.5); // drawn 1:1, never stretched
      expect(Math.abs(pl.height / strip.height - pl.width / STRIP_UNITS)).toBeLessThan(1 / strip.height);
      expect(strip.svg).toMatch(new RegExp(`^<svg[^>]* width="${canvas.width}" height="[\\d.]+" viewBox="0 0 ${STRIP_UNITS} ${strip.height}"`));
    }
  });
  it.skipIf(process.platform !== "darwin")("rasterised text: same glyph aspect and the same size RELATIVE to W at 1000, 1600, 1950 and 2400 px (system fonts)", () => {
    const bbox = (pxWidth: number) => {
      const { svg } = stripSvg([{ kind: "heading", text: "HHHH MMMM" }], { pxWidth });
      const img = new Resvg(svg, { font: { loadSystemFonts: true }, background: "rgba(0,0,0,0)" }).render();
      const px = img.pixels; // (a getter that copies: read once)
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      const top = Math.ceil((STRIP_PAD.top + 3) * pxWidth / STRIP_UNITS);
      for (let y = top; y < img.height; y++) for (let x = 0; x < img.width; x++) if (px[(y * img.width + x) * 4 + 3] > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return { w: x1 - x0 + 1, h: y1 - y0 + 1, W: img.width };
    };
    const a = bbox(1000);
    expect(a.W).toBe(1000);
    expect(a.h).toBeGreaterThan(10);
    for (const W of [1600, 1950, 2400]) {
      const b = bbox(W);
      expect(b.W).toBe(W);
      expect(Math.abs((b.w / b.h) / (a.w / a.h) - 1), `aspect at ${W}`).toBeLessThan(0.05);
      expect(Math.abs((b.w / b.W) / (a.w / a.W) - 1), `relative width at ${W}`).toBeLessThan(0.03);
      expect(Math.abs((b.h / b.W) / (a.h / a.W) - 1), `relative height at ${W}`).toBeLessThan(0.06);
    }
  });
});

describe("sizes relative to the image width (slide-legible), colour-bar grid", () => {
  it("on a 13.33 in slide: body and colour-bar text 16–18 pt, heading 22–24 pt; bars 0.28 W x 0.022 W", () => {
    expect(STRIP_REL.text).toBeCloseTo(0.018, 6);
    expect(STRIP_REL.title).toBeCloseTo(0.024, 6);
    for (const v of [STRIP_REL.text, STRIP_REL.barTitle]) { expect(slidePt(v)).toBeGreaterThanOrEqual(16); expect(slidePt(v)).toBeLessThanOrEqual(18); }
    expect(slidePt(STRIP_REL.title)).toBeGreaterThanOrEqual(22);
    expect(slidePt(STRIP_REL.title)).toBeLessThanOrEqual(24);
    expect(COLORBAR.width / STRIP_UNITS).toBeCloseTo(0.28, 9);
    expect(COLORBAR.height / STRIP_UNITS).toBeCloseTo(0.022, 9);
    expect(STRIP_FS.text).toBeCloseTo(18, 9);
    expect(STRIP_FS.title).toBeCloseTo(24, 9);
  });
  it("map strip: every font size is 0.018 W (heading 0.024 W), whatever the on-screen width and pixel width", () => {
    for (const css of [800, 1300, 1920]) {
      const { svg } = mapStripSvg(ctx(css, ["dpm", "dunes", "rdpa"]), mapExportWidth(css));
      const sizes = [...svg.matchAll(/<text[^>]*font-size="([\d.]+)"/g)].map((m) => Number(m[1]) / STRIP_UNITS);
      expect(sizes.length).toBeGreaterThan(10);
      expect(new Set(sizes)).toEqual(new Set([STRIP_REL.text, STRIP_REL.title]));
      // lines scale too: separator, ticks, scale bar
      expect(Number(svg.match(/class="separator"[^>]*stroke-width="([\d.]+)"/)![1]) / STRIP_UNITS).toBeCloseTo(STRIP_REL.line.rule, 4);
      expect(Number(svg.match(/class="scalebar"[^>]*stroke-width="([\d.]+)"/)![1]) / STRIP_UNITS).toBeCloseTo(STRIP_REL.line.bold, 4);
    }
    // the layout does not depend on the on-screen width (apart from the scale-bar length)
    const strip = (css: number) => mapStripSvg(ctx(css, ["dpm", "aridity"])).svg.replace(/<path class="scalebar"[^>]*>/, "").replace(/<text[^>]*>[^<]*km[^<]*<\/text>/, "").replace(/strip-grad-\d+/g, "g");
    expect(strip(800)).toBe(strip(1920));
  });
  it("scale bar: the map's scale converted to strip units (same fraction of the image as on the map)", () => {
    for (const css of [800, 1300, 1920]) {
      const items = mapStripItems(ctx(css, ["dpm"]));
      const mk = items.find((i) => i.kind === "mapkeys") as Extract<(typeof items)[number], { kind: "mapkeys" }>;
      const mpp = (40075016.686 * Math.cos((-24.5 * Math.PI) / 180)) / (512 * 2 ** 6.2); // m per CSS px
      const km = Number(mk.scale!.label.replace(" km", ""));
      expect(mk.scale!.px / STRIP_UNITS).toBeCloseTo((km * 1000) / mpp / css, 6);
      expect(mk.scale!.px / STRIP_UNITS).toBeLessThanOrEqual(0.15);
    }
  });
  it("plots: tick / axis / compass labels 0.018 W, legends 0.018 W, title 0.024 W (fonts in the plot x its scale)", async () => {
    const { p } = await openPanel();
    for (const k of PLOT_KEYS) {
      const x = p.plotExport(k)!;
      const m = x.svg.match(/^<svg[^>]*>(<svg x="([\d.]+)" y="([\d.]+)" ([^>]*)>)/)!;
      const dw = Number(m[4].match(/ width="([\d.]+)"/)![1]), vb = Number(m[4].match(/viewBox="0 0 ([\d.]+) /)![1]);
      const kk = dw / vb;
      const plot = x.svg.slice(x.svg.indexOf(m[1]), x.svg.indexOf('<svg x="0" y="'));
      const fs = [...plot.matchAll(/font-size="([\d.]+)"/g)].map((q) => (Number(q[1]) * kk) / STRIP_UNITS);
      expect(fs.length, k).toBeGreaterThan(0);
      for (const v of fs) expect(v, k).toBeCloseTo(0.018, 4);
      const strip = x.svg.slice(x.svg.indexOf('<svg x="0" y="'));
      const sfs = new Set([...strip.matchAll(/<text[^>]*font-size="([\d.]+)"/g)].map((q) => Number(q[1]) / STRIP_UNITS));
      expect(sfs).toEqual(new Set([0.018, 0.024]));
    }
  });
  it("3 colour bars per row, then wrap; all the same size; rows aligned", () => {
    expect(RASTERS.length).toBeGreaterThanOrEqual(5);
    expect(colorbarsPerRow()).toBe(3);
    for (const css of [700, 1300, 1920]) {
      const { svg } = mapStripSvg(ctx(css, RASTERS), mapExportWidth(css));
      const bars = els(svg, "colorbar");
      expect(bars).toHaveLength(RASTERS.length);
      for (const b of bars) { expect(b.w).toBeCloseTo(COLORBAR.width, 2); expect(b.h).toBeCloseTo(COLORBAR.height, 2); expect(b.x + b.w).toBeLessThanOrEqual(STRIP_UNITS - STRIP_PAD.side + 0.01); }
      const ys = [...new Set(bars.map((b) => b.y))];
      expect(ys).toHaveLength(Math.ceil(RASTERS.length / 3));
      for (const y of ys) expect(bars.filter((b) => b.y === y).length).toBeLessThanOrEqual(3);
      const xs = bars.filter((b) => b.y === ys[0]).map((b) => b.x);
      expect(xs).toHaveLength(3);
      xs.forEach((x, i) => expect(x).toBeCloseTo(STRIP_PAD.side + i * (COLORBAR.width + COLORBAR.gap), 2));
      expect(xs[2] + COLORBAR.width).toBeCloseTo(STRIP_UNITS - STRIP_PAD.side, 6); // the row spans the inner width
    }
  });
});

describe("no redundant style text", () => {
  it("no style text on colour bars (colormap, limits, log / linear / symmetric scale)", () => {
    const cfg = { dpm: { cfg: { colormap: "magma", log: true, vmin: 1e3, vmax: 1e7 } }, at: { cfg: { colormap: "viridis" } } };
    const { svg } = mapStripSvg(ctx(1300, RASTERS, cfg));
    const t = svgText(svg);
    expect(t).not.toMatch(/colou?r ?map|limits|log scale|linear|symmetric|symlog|magma|viridis|cividis|inferno/i);
    for (const b of mapStripItems(ctx(1300, RASTERS, cfg)).filter((i) => i.kind === "colorbar")) expect((b as { detail: string }).detail).not.toMatch(/scale|colormap|limit/);
  });
});

describe("no grid indices in exported text", () => {
  it("map strip and every plot strip: no grid row / column / index", async () => {
    expect(svgText(mapStripSvg(ctx(1300, [...RASTERS, "rdpa"])).svg)).not.toMatch(/\brow\b|\bcolumn\b|grid index|\biy\b|\bix\b/i);
    const { p } = await openPanel();
    for (const k of PLOT_KEYS) {
      const t = svgText(p.plotExport(k)!.svg.split(/<svg x="0" y="[\d.]+" /)[1]);
      expect(t, k).toMatch(/Cell centre 24\.50° S, 15\.20° E/);
      expect(t, k).not.toMatch(/\brow\b|\bcolumn\b|grid\b|1145|1952/i);
    }
  });
});

describe("no halo around rose tick labels (on screen and in exports)", () => {
  it("no halo class, no stroked text, no paint-order on any plot text, dark (screen) and light (export)", async () => {
    const { p, root } = await openPanel();
    const svgs = [...[...root.querySelectorAll(".fig-svg")].map((e) => e.innerHTML), ...PLOT_KEYS.map((k) => p.plotExport(k)!.svg)];
    expect(svgs.length).toBeGreaterThanOrEqual(8);
    for (const s of svgs) {
      expect(s).not.toMatch(/halo/);
      expect(s).not.toMatch(/<text[^>]*\bstroke=/);
      expect(s).not.toMatch(/paint-order|text-shadow/);
    }
    // ring (radial tick) labels are present as plain text
    expect(svgs.some((s) => /<text[^>]*class="ring"/.test(s))).toBe(true);
  });
});

describe("layout: separator, image then legends then text, nothing above or beside", () => {
  it("separator spans the full width, padded from the image", () => {
    for (const width of [700, 1300]) {
      const { svg } = mapStripSvg(ctx(width, ["dpm", "rdpa"]));
      const [sep] = els(svg, "separator");
      expect(sep.x1).toBe(0);
      expect(sep.x2).toBe(STRIP_UNITS);
      expect(sep.y1 / STRIP_UNITS).toBeCloseTo(STRIP_REL.pad.top, 9); // 1.5 % of W below the image
      expect(sep.y1).toBe(STRIP_PAD.top);
      // nothing drawn above the separator
      for (const m of svg.matchAll(/ y="([\d.]+)"/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(STRIP_PAD.top);
    }
  });
  it("map strip: colour bars, keys and legends come before all descriptive text", () => {
    const { svg } = mapStripSvg(ctx(1300, [...RASTERS, "dunes", "rdpa"], { rdpa: { cfg: { mode: "streamlines", vecColor: "#112233" } } }));
    const firstText = Math.min(...els(svg, "title").map((e) => e.y), ...els(svg, "desc").map((e) => e.y));
    const legend = [...els(svg, "colorbar"), ...els(svg, "bar-title"), ...els(svg, "tick-label"), ...els(svg, "bar-detail"), ...els(svg, "legend-label"), ...els(svg, "swatch").filter((e) => Number.isFinite(e.y))];
    expect(legend.length).toBeGreaterThan(10);
    for (const e of legend) expect(e.y).toBeLessThan(firstText);
    expect(svgText(svg)).toMatch(/Dune Atlas · map\.geomorphlab\.org/);
  });
  it("plot exports: plot at the top, centred; the whole strip below it; legends before text", async () => {
    const { p } = await openPanel();
    for (const k of PLOT_KEYS) {
      const x = p.plotExport(k)! as ReturnType<CellPanel["plotExport"]> & { plotHeight: number };
      const outer = x.svg.match(/^<svg[^>]*>/)![0];
      const parts = x.svg.slice(outer.length).match(/^<svg x="([\d.]+)" y="([\d.]+)" [^>]*width="([\d.]+)"/)!;
      expect(parts, k).not.toBeNull();
      expect(Number(parts[2])).toBeLessThan(0.02 * x.width); // at the top
      expect(Number(parts[1]) * 2 + Number(parts[3])).toBeCloseTo(x.width, 1); // centred
      const strip = x.svg.match(/<svg x="0" y="([\d.]+)" ([\s\S]*)<\/svg><\/svg>$/)!;
      expect(Number(strip[1]), k).toBeCloseTo(x.plotHeight, 2);
      expect(x.plotHeight + Number(strip[2].match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)![1])).toBeCloseTo(x.height, 2);
      const s = strip[2];
      const firstText = Math.min(...els(s, "title").map((e) => e.y), ...els(s, "desc").map((e) => e.y));
      for (const e of [...els(s, "colorbar"), ...els(s, "legend-label"), ...els(s, "bar-title")]) expect(e.y, k).toBeLessThan(firstText);
    }
  });
});
