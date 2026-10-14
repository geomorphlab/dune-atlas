// @vitest-environment happy-dom
// Image exports: the information strip below the map (contents per active layer set, scale bar,
// north arrow, sources), the file names, transparency and no dark colours (strip rasterised with
// resvg), and the panel plots re-rendered in the light theme with the on-screen settings.
import { PLOT_EXPORT_WIDTH } from "../src/export/png";
import { describe, expect, it, vi } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import { loadRegistry } from "../src/registry/load";
import { mapExportFilename, mapStripItems, mapStripSvg, scaleBar, type MapStripContext } from "../src/export/mapExport";
import { STRIP_COLORS, stripSvg, wrapText } from "../src/export/strip";
import { textWidth } from "../src/export/texsvg";
import { texToPlain } from "../src/util/plaintext";
import { CellPanel } from "../src/ui/cellPanel";
import type { CellStore } from "../src/cell/cellstore";
import { DARK_THEME, LIGHT_THEME } from "../src/cell/plottheme";
import { plotFilename, PLOT_KEYS } from "../src/export/plotExport";
import { applyDatasetLayers } from "../src/registry/merge";
import { sampleCell } from "./publictext";
import { FIELD_VARS } from "./helpers";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });
const reg = loadRegistry().registry;
const DATE = new Date("2026-10-13T08:00:00Z");
const ctx = (over: Partial<MapStripContext> = {}, layers: Record<string, { visible: boolean; opacity: number; cfg?: object }> = {}): MapStripContext => ({
  reg, width: 1200, includeBasemap: true, shareLink: "https://map.geomorphlab.org/#v=AQEBAg", date: DATE,
  view: { lon: 15.25, lat: -24.5, zoom: 6.2, bearing: 0, pitch: 0, proj: "globe" },
  state: { layers: Object.fromEntries(reg.layers.map((l) => [l.id, layers[l.id] ?? { visible: false, opacity: 1 }])) as never, order: ["dunes", "rdpa", "dpm", "aridity", ...reg.layers.map((l) => l.id).filter((x) => !["dunes", "rdpa", "dpm", "aridity"].includes(x))], utIndex: 14, dataset: "era5-land", basemap: "openfreemap-dark" },
  ...over,
});
const SET = { dunes: { visible: true, opacity: 0.7, cfg: { fill: "#c08040" } }, rdpa: { visible: true, opacity: 1, cfg: { mode: "streamlines", vecColor: "#112233" } }, dpm: { visible: true, opacity: 0.8, cfg: { colormap: "magma", log: true } }, aridity: { visible: true, opacity: 0.6 } };
const texts = (items: ReturnType<typeof mapStripItems>) => items.map((i) => ("text" in i ? i.text : "title" in i ? `${i.title} | ${i.detail}` : i.kind === "swatches" ? i.items.map((s) => s.label).join(" ; ") : JSON.stringify(i))).join("\n");
/** all <text> of an SVG joined (wrapped lines are separate text elements) */
const svgText = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].replace(/&amp;/g, "&")).join(" ");

describe("map export: information strip", () => {
  it("colour bars for the active raster layers (top first), keys for vectors / streamlines, view, sources, link, date", () => {
    const items = mapStripItems(ctx({}, SET));
    const bars = items.filter((i) => i.kind === "colorbar") as Extract<(typeof items)[number], { kind: "colorbar" }>[];
    const dpm = reg.layers.find((l) => l.id === "dpm")!, ar = reg.layers.find((l) => l.id === "aridity")!;
    expect(bars.map((b) => b.title)).toEqual(["Drift potential ($DP$)", "Aridity index ($\\mathrm{AI}$)"]);
    expect(bars).toHaveLength(2);
    expect(bars[0].detail).toBe("$\\mathrm{m^{2}\\,yr^{-1}}$ · at $u_{*,th}$ = 0.15 $\\mathrm{m\\,s^{-1}}$");
    expect(bars[1].detail).not.toMatch(/u\*,th/); // threshold-independent: no threshold text
    expect(bars[0].colors.length).toBeGreaterThan(8);
    expect(bars[0].ticks.every((t) => t.pos >= 0 && t.pos <= 1)).toBe(true);
    for (const b of bars) expect(texToPlain(b.title + b.detail)).not.toMatch(/[$\\]/); // TeX only inside $...$ (rendered as paths)
    const t = texts(items);
    expect(t).toContain("Globe (perspective view) · centre 24.50° S, 15.25° E · zoom 6.2 · wind dataset ERA5-Land 0.1°, 1950–2024 · threshold friction velocity $u_{*,th}$ = 0.15 $\\mathrm{m\\,s^{-1}}$");
    const sw = items.find((i) => i.kind === "swatches") as Extract<(typeof items)[number], { kind: "swatches" }>;
    expect(sw.items.map((s) => [s.color, s.shape])).toEqual([["#c08040", "box"], ["#112233", "line"]]);
    expect(sw.items[1].label).toMatch(/\(streamlines, direction of transport\) at \$u_\{\*,th\}\$ = 0\.15 \$\\mathrm\{m\\,s\^\{-1\}\}\$/);
    const keys = items.find((i) => i.kind === "mapkeys") as Extract<(typeof items)[number], { kind: "mapkeys" }>;
    expect(keys.northNote).toBe("north up at view centre");
    expect(keys.scale!.px).toBeGreaterThan(40); expect(keys.scale!.px).toBeLessThanOrEqual(120);
    expect(t).toContain("doi:10.1038/s41467-026-75466-y");
    expect(t).toContain("ERA5-Land hourly 10 m wind 1950–2024 (Muñoz-Sabater et al. 2021");
    expect(t).toContain("Contains modified Copernicus Climate Change Service information (ERA5-Land, 1950–2024)");
    expect(t).toContain("Aridity: Global Aridity Index v3.1");
    expect(t).not.toContain("Vegetation cover:");
    expect(t).toContain("Basemap: Dark (OpenFreeMap), OpenFreeMap © OpenMapTiles Data from OpenStreetMap.");
    expect(t).toContain("View: https://map.geomorphlab.org/#v=AQEBAg");
    expect(t).toContain("Exported 2026-10-13");
  });
  it("ERA5, Mercator, no basemap, vegetation, inverted dunes; scale bar omitted at low zoom", () => {
    const r2 = loadRegistry().registry;
    applyDatasetLayers(r2, "era5");
    const lay = { dunes: { visible: true, opacity: 0.7, cfg: { invert: true } }, vegetation: { visible: true, opacity: 1 } };
    const items = mapStripItems(ctx({ reg: r2, includeBasemap: false, view: { lon: -179.99, lat: 66.3, zoom: 1.2, bearing: 0, pitch: 0, proj: "mercator" }, state: { ...ctx({}, lay).state, dataset: "era5" } }, lay));
    const t = texts(items);
    expect(t).toContain("Web Mercator EPSG:3857 · centre 66.30° N, 179.99° W · zoom 1.2 · wind dataset ERA5 0.25°, 1950–2024");
    expect(t).not.toContain("threshold friction velocity"); // no threshold-dependent layer
    expect(t).toContain("Hersbach et al. 2020");
    expect(t).toContain("(ERA5, 1950–2024)");
    expect(t).toContain("Vegetation cover: CSIRO MODIS Fractional Cover v3.1");
    expect(t).not.toContain("Basemap:");
    expect(t).toContain("land without mapped dunes");
    const keys = items.find((i) => i.kind === "mapkeys") as Extract<(typeof items)[number], { kind: "mapkeys" }>;
    expect(keys.scale).toBeNull();
    expect(keys.scaleNote).toMatch(/omitted/);
    expect(keys.northNote).toBeUndefined();
  });
  it("scale bar at the view centre", () => {
    const s = scaleBar({ lat: 0, zoom: 9 })!; // 152.87 m/px: 120 px = 18.3 km -> a 10 km bar of 65.4 px
    expect(s.label).toBe("10 km");
    expect(s.px).toBeCloseTo(10000 / (40075016.686 / (512 * 512)), 6);
    expect(scaleBar({ lat: 60, zoom: 16 })!.label).toMatch(/ m$/);
  });
  it("file name", () => {
    expect(mapExportFilename("era5-land", { lat: -24.5, lon: 15.2, zoom: 6.24 }, DATE)).toBe("dune-atlas_map_era5-land_-24.50_15.20_z6.2_2026-10-13.png");
    expect(mapExportFilename("era5", { lat: 66.3, lon: 180.01, zoom: 3 }, DATE)).toBe("dune-atlas_map_era5_66.30_-179.99_z3.0_2026-10-13.png");
  });
  it("strip SVG: transparent background, dark text only (no dark fills), legible on white; any pixel width keeps the layout", () => {
    const c = ctx({}, SET);
    const { svg, height } = mapStripSvg(c);
    expect(svg).not.toMatch(/<rect(?![^>]*class="colorbar")(?![^>]*fill="#[0-9a-f]{6}" stroke)[^>]*fill="(?!url)/); // only colour bars / swatches are filled rects
    const fills = [...svg.matchAll(/<text[^>]*fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    expect(new Set(fills)).toEqual(new Set([STRIP_COLORS.text, STRIP_COLORS.muted]));
    const png = new Resvg(svg, { font: { loadSystemFonts: true }, background: "rgba(0,0,0,0)" }).render();
    expect(png.height).toBe(height);
    const px = png.pixels;
    let opaque = 0, darkOpaque = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] > 128) { opaque++; if (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2] < 90) darkOpaque++; }
    }
    const n = px.length / 4;
    for (const [x, y] of [[0, png.height - 1], [png.width - 1, png.height - 1], [png.width - 2, 2]]) expect(px[(y * png.width + x) * 4 + 3], `corner ${x},${y}`).toBe(0);
    expect(opaque / n).toBeLessThan(0.3); // mostly transparent
    if (process.platform === "darwin") expect(darkOpaque).toBeGreaterThan(200); // the text is there, dark (needs system fonts)
    expect(darkOpaque / n).toBeLessThan(0.15); // no dark background blocks
    const two = mapStripSvg(c, 2000);
    expect(two.height).toBe(height);
    expect(two.svg).toMatch(new RegExp(`width="2000" height="${height * 2}" viewBox="0 0 1000 ${height}"`));
  });
  it("text wrapping (Helvetica / Arial advance widths)", () => {
    const lines = wrapText("a ".repeat(200), 100, 10);
    expect(lines.length).toBeGreaterThan(5);
    expect(lines.every((l) => textWidth(l, 10) <= 100)).toBe(true);
    expect(lines.slice(0, -1).every((l) => textWidth(`${l} a`, 10) > 100)).toBe(true); // greedy: full lines
    expect(stripSvg([{ kind: "text", text: "x" }]).height).toBeGreaterThan(20);
  });
});

describe("cell-panel plot exports (light theme, same settings as on screen)", () => {
  const DARK_ONLY = [DARK_THEME.halo, DARK_THEME.current, DARK_THEME.currentLine, "#141a21", DARK_THEME.ring, DARK_THEME.label];
  const open = async () => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const cell = sampleCell();
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, shareLink: () => "https://map.geomorphlab.org/#v=AQEBAg",
      exportMeta: () => ({ datasetId: "era5-land", datasetTitle: "ERA5-Land 0.1°, 1950–2024", dataVersion: "v1", permalink: "x" }) });
    await p.show({ query: async () => cell, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, cell.iy, cell.ix);
    return { p, root };
  };
  it("every plot section has an Export menu (PNG, SVG): one size", async () => {
    const { root } = await open();
    expect([...root.querySelectorAll(".export-menu")].map((m) => m.getAttribute("data-plot"))).toEqual(PLOT_KEYS);
    for (const m of root.querySelectorAll(".export-menu")) expect([...m.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["PNG", "SVG"]);
  });
  it("SVG: light theme (no dark-theme colours), white background (transparent option), strip with title, cell, dataset, threshold, source, link; file names", async () => {
    const { p } = await open();
    for (const k of PLOT_KEYS) {
      const x = p.plotExport(k)!;
      expect(x, k).not.toBeNull();
      for (const c of DARK_ONLY) expect(x.svg.toLowerCase(), `${k} has ${c}`).not.toContain(`"${c}"`);
      expect(x.svg).not.toContain("currentColor");
      expect(x.svg).toContain(LIGHT_THEME.text);
      expect(svgText(x.svg)).toContain("Cell centre 24.50° S, 15.20° E · ERA5-Land 0.1°, 1950–2024");
      expect(svgText(x.svg)).toContain("doi:10.1038/s41467-026-75466-y");
      expect(svgText(x.svg)).toContain("Contains modified Copernicus Climate Change Service information (ERA5-Land, 1950–2024)");
      expect(svgText(x.svg)).toContain("View: https://map.geomorphlab.org/#v=AQEBAg");
      expect(svgText(x.svg).includes(texToPlain("threshold friction velocity $u_{*,th}$ = 0.15 $\\mathrm{m\\,s^{-1}}$")), k).toBe(k !== "wind-rose"); // plain fallback (no math renderer)
      expect(x.svg).not.toMatch(/\$|\\[a-z]+\{/); // no raw LaTeX in the strip
      const png = new Resvg(x.svg, { font: { loadSystemFonts: true }, background: "rgba(0,0,0,0)" }).render();
      // white background by default; transparent on request
      expect([...png.pixels.slice(0, 4)], `${k} corner white`).toEqual([255, 255, 255, 255]);
      expect(png.width).toBe(x.pxWidth);
      const xt = p.plotExport(k, PLOT_EXPORT_WIDTH, null, true)!;
      expect(xt.svg).not.toContain("export-background");
      expect(new Resvg(xt.svg, { font: { loadSystemFonts: true }, background: "rgba(0,0,0,0)" }).render().pixels[3], `${k} corner transparent`).toBe(0);
    }
    expect(p.plotExport("wind-rose")!.name("svg")).toBe("dune-atlas_wind-rose_era5-land_-24.5_15.2.svg");
    expect(p.plotExport("flux-rose")!.name("png")).toBe("dune-atlas_flux-rose_era5-land_-24.5_15.2_ut0.15.png");
    expect(plotFilename("qsdiv", "era5", { lat: -24.5, lon: 15.25 }, 0.2, "png")).toBe("dune-atlas_qsdiv_era5_-24.5_15.25_ut0.20.png");
    expect(p.plotExport("modes", 2000)!.svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="2000" height="[\d.]+" viewBox="0 0 1000 /);
  });
  it("same settings as on screen: sectors, flux mode, axis units and threshold follow the panel", async () => {
    const { p, root } = await open();
    const flux = root.querySelector('[data-section="fluxRose"]')!;
    (flux.querySelector("select") as HTMLSelectElement).value = "elongation";
    flux.querySelector("select")!.dispatchEvent(new Event("change"));
    const abs = flux.querySelector('input[value="abs"]') as HTMLInputElement;
    abs.checked = true; abs.dispatchEvent(new Event("change"));
    p.setThreshold(30);
    const onScreen = flux.querySelector(".fig-svg desc")!.textContent!;
    const x = p.plotExport("flux-rose")!;
    expect(x.svg).toContain(`<desc id="x-flux-rose-d">${onScreen.replace(/&/g, "&amp;")}</desc>`);
    expect(onScreen).toMatch(/crest sand flux .* m²\/yr, at u\*,th 0\.31 m\/s/);
    expect(svgText(x.svg)).toContain("Elongation");
    expect(svgText(x.svg)).toContain(texToPlain("$\\mathrm{m^{2}\\,yr^{-1}}$ per sector"));
    expect(svgText(x.svg)).toContain(texToPlain("$u_{*,th}$ = 0.31 $\\mathrm{m\\,s^{-1}}$"));
    expect(x.name("png")).toMatch(/_ut0\.31\.png$/);
    // the number of petal wedges equals the on-screen rose
    const n = (s: string) => (s.match(/<path d="M/g) ?? []).length;
    expect(n(x.svg.split("<svg")[2])).toBe(n(flux.querySelector(".fig-svg")!.innerHTML));
  });
});
