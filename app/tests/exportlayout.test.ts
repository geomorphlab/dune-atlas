// @vitest-environment happy-dom
// Export layout rules (author feedback): one 300-dpi resolution with the dpi written into the PNG
// (pHYs); slide-legible fixed sizes; colour bars of one fixed size in a wrapping grid; no
// redundant style text on colour bars; no grid row / column in exported text; no halo on rose tick
// labels; a full-width separator padded from the image; all text below the image (image, then
// colour bars / legends, then descriptive text). Also the root cause of squeezed strip text at
// high scale: the strip must use the ACTUAL canvas scale on both axes.
import { describe, expect, it, vi } from "vitest";
import zlib from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import { loadRegistry } from "../src/registry/load";
import { mapStripItems, mapStripSvg, type MapStripContext } from "../src/export/mapExport";
import { COLORBAR, colorbarsPerRow, pt, STRIP_FS, STRIP_PAD, stripSvg } from "../src/export/strip";
import { dpiToPpm, EXPORT_DPI, EXPORT_PIXEL_RATIO, readPngPhys, setPngDpi, stripPlacement } from "../src/export/png";
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

describe("one resolution: 300 dpi, written into the PNG", () => {
  it("pixel ratio 300/96; pHYs 11811 px/m (unit metre) directly after IHDR; CRC valid; image data untouched", () => {
    expect(EXPORT_DPI).toBe(300);
    expect(EXPORT_PIXEL_RATIO).toBe(3.125);
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
  it("the UI offers one resolution only (map: one button; plots: PNG (300 dpi) and SVG)", async () => {
    expect(EXPORT_TEXT.run).toBe("Export PNG (300 dpi)");
    const help = HELP_SECTIONS.map((s) => s.body).join(" ");
    expect(help).toMatch(/300 dpi/);
    expect(help).not.toMatch(/2×|\b2x\b/);
    const { p, root } = await openPanel();
    for (const m of root.querySelectorAll(".export-menu")) expect([...m.querySelectorAll("button")].map((b) => b.textContent)).toEqual([EXPORT_TEXT.png, EXPORT_TEXT.svg]);
    for (const k of PLOT_KEYS) {
      const one = p.plotExport(k)!, hi = p.plotExport(k, EXPORT_PIXEL_RATIO)!;
      expect(hi.svg).toContain(`width="${one.width * 3.125}" height="${one.height * 3.125}" viewBox="0 0 ${one.width} ${one.height}"`);
    }
  });
});

describe("root cause of squeezed text: the strip uses the actual canvas scale on both axes", () => {
  it("canvas clamped by maxCanvasSize (actual scale < requested): uniform placement, strip width = canvas width", () => {
    const cssW = 1400, cssH = 900, items = mapStripItems(ctx(cssW, ["dpm", "aridity"]));
    for (const canvas of [{ width: cssW * 3.125, height: cssH * 3.125 }, { width: 4096, height: Math.round(4096 * cssH / cssW) }, { width: cssW, height: cssH }]) {
      const strip1 = stripSvg(items, cssW);
      const pl = stripPlacement(canvas, cssW, strip1);
      expect(pl.scale).toBeCloseTo(canvas.width / cssW, 12);
      expect(pl.dpi).toBeCloseTo(96 * pl.scale, 9);
      expect(pl.y).toBe(canvas.height);
      expect(pl.width).toBe(canvas.width);
      expect(Math.abs(pl.height / strip1.height - pl.width / cssW)).toBeLessThan(1 / strip1.height); // same factor on both axes
      const s = stripSvg(items, cssW, { scale: pl.scale });
      expect(s.svg).toMatch(new RegExp(`^<svg[^>]* width="${+(cssW * pl.scale).toFixed(3)}" height="${+(s.height * pl.scale).toFixed(3)}"|^<svg[^>]* width="${cssW * pl.scale}"`));
    }
  });
  it.skipIf(process.platform !== "darwin")("rasterised text has the same glyph aspect at scale 1, 3.125 and a clamped 2.93 (system fonts)", () => {
    const bbox = (scale: number) => {
      const { svg } = stripSvg([{ kind: "heading", text: "HHHH MMMM" }], 500, { scale });
      const img = new Resvg(svg, { font: { loadSystemFonts: true }, background: "rgba(0,0,0,0)" }).render();
      const px = img.pixels; // (a getter that copies: read once)
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      const top = Math.ceil((STRIP_PAD.top + 3) * scale);
      for (let y = top; y < img.height; y++) for (let x = 0; x < img.width; x++) if (px[(y * img.width + x) * 4 + 3] > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
    };
    const a = bbox(1), b = bbox(3.125), c = bbox(4096 / 1400);
    expect(a.h).toBeGreaterThan(10);
    for (const [r, s] of [[b, 3.125], [c, 4096 / 1400]] as const) {
      expect(Math.abs((r.w / r.h) / (a.w / a.h) - 1), `aspect at ${s}`).toBeLessThan(0.06);
      expect(Math.abs(r.w / a.w / s - 1), `width at ${s}`).toBeLessThan(0.05);
    }
  });
});

describe("slide-legible fixed sizes and the colour-bar grid", () => {
  it("text at least 14 pt, titles at least 18 pt; colour bars 2.75 × 0.22 in", () => {
    expect(STRIP_FS.text).toBeGreaterThanOrEqual(pt(14));
    expect(STRIP_FS.barTitle).toBeGreaterThanOrEqual(pt(14));
    expect(STRIP_FS.title).toBeGreaterThanOrEqual(pt(18));
    expect(COLORBAR.width).toBeCloseTo(264, 6);
    expect(COLORBAR.height).toBeCloseTo(21.12, 6);
    const { svg } = mapStripSvg(ctx(1300, ["dpm"]));
    for (const m of svg.matchAll(/<text[^>]*font-size="([\d.]+)"/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(pt(14) - 1e-6);
  });
  it("all bars the same size whatever the view width; as many per row as fit, then wrap; rows aligned", () => {
    expect(RASTERS.length).toBeGreaterThanOrEqual(5);
    for (const [width, cols] of [[1300, 4], [1000, 3], [700, 2], [400, 1], [1920, 6]] as const) {
      expect(colorbarsPerRow(width), `width ${width}`).toBe(cols);
      const { svg } = mapStripSvg(ctx(width, RASTERS));
      const bars = els(svg, "colorbar");
      expect(bars).toHaveLength(RASTERS.length);
      for (const b of bars) { expect(b.w).toBeCloseTo(COLORBAR.width, 2); expect(b.h).toBeCloseTo(COLORBAR.height, 2); expect(b.x + b.w).toBeLessThanOrEqual(width - STRIP_PAD.side + 0.01); }
      const ys = [...new Set(bars.map((b) => b.y))];
      expect(ys).toHaveLength(Math.ceil(RASTERS.length / cols));
      for (const y of ys) expect(bars.filter((b) => b.y === y).length).toBeLessThanOrEqual(cols);
      expect(bars.filter((b) => b.y === ys[0])).toHaveLength(Math.min(cols, RASTERS.length));
      const xs = bars.filter((b) => b.y === ys[0]).map((b) => b.x);
      xs.forEach((x, i) => expect(x).toBeCloseTo(STRIP_PAD.side + i * (COLORBAR.width + COLORBAR.gap), 2));
    }
  });
  it("no redundant style text on colour bars (colormap, limits, log / linear / symmetric scale)", () => {
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
      expect(sep.x2).toBe(width);
      expect(sep.y1).toBeGreaterThanOrEqual(12);
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
      const parts = x.svg.slice(outer.length).match(/^<svg x="([\d.]+)" y="0" [^>]*width="([\d.]+)"/)!;
      expect(parts, k).not.toBeNull();
      expect(Number(parts[1]) * 2 + Number(parts[2])).toBeCloseTo(x.width, 1); // centred
      const strip = x.svg.match(/<svg x="0" y="([\d.]+)" ([\s\S]*)<\/svg><\/svg>$/)!;
      expect(Number(strip[1]), k).toBe(x.plotHeight);
      expect(x.plotHeight + Number(strip[2].match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)![1])).toBeCloseTo(x.height, 6);
      const s = strip[2];
      const firstText = Math.min(...els(s, "title").map((e) => e.y), ...els(s, "desc").map((e) => e.y));
      for (const e of [...els(s, "colorbar"), ...els(s, "legend-label"), ...els(s, "bar-title")]) expect(e.y, k).toBeLessThan(firstText);
    }
  });
});
