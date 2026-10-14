// @vitest-environment happy-dom
// Cursor coordinate readout beside the scale bar: format, mouse / touch behaviour, placement and
// style next to the scale bar, never in image exports.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CoordsControl, formatLatLon } from "../src/core/ui/coords";
import { loadRegistry } from "../src/core/registry/load";
import { mapStripItems } from "../src/core/export/mapExport";

type H = (e: { lngLat: { lat: number; lng: number } }) => void;
function fakeMap() {
  const hs = new Map<string, Set<H>>();
  return {
    on: (t: string, f: H) => { (hs.get(t) ?? hs.set(t, new Set()).get(t)!).add(f); },
    off: (t: string, f: H) => { hs.get(t)?.delete(f); },
    fire: (t: string, lat = 0, lng = 0) => { for (const f of hs.get(t) ?? []) f({ lngLat: { lat, lng } }); },
    count: () => [...hs.values()].reduce((a, s) => a + s.size, 0),
  };
}

describe("coordinate format", () => {
  it("2 decimals, hemisphere letters, wrapped longitude", () => {
    expect(formatLatLon(-24.5312, 15.2149)).toBe("24.53° S, 15.21° E");
    expect(formatLatLon(32.98, -115.734)).toBe("32.98° N, 115.73° W");
    expect(formatLatLon(0, 0)).toBe("0.00° N, 0.00° E");
    expect(formatLatLon(-0.001, -0.004)).toBe("0.00° N, 0.00° E"); // no "0.00° S"
    expect(formatLatLon(10, 190)).toBe("10.00° N, 170.00° W");
    expect(formatLatLon(10, -181)).toBe("10.00° N, 179.00° E");
    expect(formatLatLon(10, 180)).toBe("10.00° N, 180.00° E");
    expect(formatLatLon(-90, 539.999)).toBe("90.00° S, 180.00° E");
  });
});

describe("readout control", () => {
  it("mouse: hidden until the cursor moves over the map, follows it, keeps the last value (dimmed) when it leaves", () => {
    const m = fakeMap(), c = new CoordsControl({ touch: false });
    const el = c.onAdd(m as never);
    expect(el.classList.contains("maplibregl-ctrl")).toBe(true);
    expect(el.hidden).toBe(true);
    m.fire("mousemove", -24.531, 15.214);
    expect(el.hidden).toBe(false);
    expect(el.textContent).toBe("24.53° S, 15.21° E");
    m.fire("mousemove", 20.1, 30.2);
    expect(el.textContent).toBe("20.10° N, 30.20° E");
    m.fire("mouseout");
    expect(el.textContent).toBe("20.10° N, 30.20° E");
    expect(el.classList.contains("stale")).toBe(true);
    m.fire("mousemove", 1, 2);
    expect(el.classList.contains("stale")).toBe(false);
    m.fire("click", 5, 5); // clicks do not change the mouse readout
    expect(el.textContent).toBe("1.00° N, 2.00° E");
    c.onRemove();
    expect(m.count()).toBe(0);
  });
  it("touch screens: nothing shown until a tap, then the last tapped point (no tracking clutter)", () => {
    const m = fakeMap(), c = new CoordsControl({ touch: true });
    const el = c.onAdd(m as never);
    m.fire("mousemove", 3, 4);
    expect(el.hidden).toBe(true);
    m.fire("click", -24.5, 15.2);
    expect(el.hidden).toBe(false);
    expect(el.textContent).toBe("24.50° S, 15.20° E");
    expect(el.title).toMatch(/tapped/);
  });
  it("placed bottom left on the SAME row as the scale bar, immediately to its right, styled like it, not clickable", () => {
    const main = fs.readFileSync(path.resolve(__dirname, "../src/main.ts"), "utf8");
    const hooks = fs.readFileSync(path.resolve(__dirname, "../src/bodies/earth/app.ts"), "utf8");
    const iScale = main.indexOf("HOOKS.scaleControl()"), iCoords = main.indexOf("new CoordsControl()");
    expect(iScale).toBeGreaterThan(0);
    expect(iCoords).toBeGreaterThan(iScale);
    expect(main.slice(iScale, main.indexOf("\n", iScale))).toContain('"bottom-left"');
    expect(main.slice(iCoords, main.indexOf("\n", iCoords))).toContain('"bottom-left"');
    const scaleMax = Number(/ScaleControl\(\{ maxWidth: (\d+) \}\)/.exec(hooks)![1]);
    const css = fs.readFileSync(path.resolve(__dirname, "../src/core/style.css"), "utf8");
    const rule = (sel: string) => { const k = css.indexOf(`\n${sel} {`) + 1; expect(k, sel).toBeGreaterThan(0); return css.slice(k, css.indexOf("}", k)); };
    const px = (r: string, prop: string) => { const m = new RegExp(`${prop}: ([^;]+);`).exec(r); expect(m, prop).not.toBeNull(); return m![1].trim(); };
    // one flex row aligned to the bottom (MapLibre floats bottom controls with clear: both and inserts
    // each new one BEFORE the existing ones, which stacked the readout above the scale bar)
    const row = rule(".maplibregl-ctrl-bottom-left");
    expect(px(row, "display")).toBe("flex");
    expect(px(row, "flex-direction")).toBe("row");
    expect(px(row, "align-items")).toBe("flex-end");
    expect(px(row, "flex-wrap")).toBe("nowrap");
    expect(rule(".maplibregl-ctrl-bottom-left .maplibregl-ctrl")).toMatch(/float: none; clear: none/);
    // visual order: scale bar first, readout to its right (whatever the DOM order)
    const scaleOrder = Number(px(rule(".maplibregl-ctrl-bottom-left .maplibregl-ctrl-scale"), "order"));
    const cr = rule(".maplibregl-ctrl-bottom-left .maplibregl-ctrl.atlas-coords");
    expect(Number(px(cr, "order"))).toBeGreaterThan(scaleOrder);
    const [mt, mr, mb, ml] = px(cr, "margin").split(/\s+/).map((v) => parseFloat(v));
    expect([mt, mr, mb]).toEqual([0, 0, 10]); // same bottom margin as MapLibre's scale bar (10 px)
    expect(ml).toBeGreaterThan(0); expect(ml).toBeLessThanOrEqual(8); // small gap
    // same height: both inherit the map's 20 px line height, 10 px text, 2 px bottom border, no top border
    const look = rule(".maplibregl-ctrl.atlas-coords");
    expect(look).toMatch(/font-size: 10px; padding: 0 5px;/);
    expect(look).toMatch(/border: 2px solid transparent; border-top: none;/);
    expect(look).toMatch(/box-sizing: border-box/);
    expect(look).toMatch(/background: rgba\(20, 26, 33, \.75\)/); // = .maplibregl-ctrl-scale
    expect(look).toMatch(/pointer-events: none/);
    expect(look).toMatch(/white-space: nowrap/);
    // vertical clearance from the layer panel: the row (10 px margin + 22 px) fits in the strip the
    // panel leaves free (top 10 px + max-height calc(100% - N px) -> N - 10 px), open or collapsed
    const rowTop = 10 + 22;
    const panel = rule("#layer-panel");
    expect(px(panel, "top")).toBe("10px");
    const free = Number(/max-height: calc\(100% - (\d+)px\)/.exec(panel)![1]) - 10;
    expect(free).toBeGreaterThan(rowTop);
    // narrow screens with the cell sheet open: the control row sits on the sheet (bottom: --cell-h)
    // and the panel stops N - 10 px above the sheet
    expect(css).toMatch(/body\.cell-open \.maplibregl-ctrl-bottom-left, body\.cell-open \.maplibregl-ctrl-bottom-right \{ bottom: var\(--cell-h, 60vh\); \}/);
    const sheet = Number(/body\.cell-open #layer-panel \{ max-height: calc\(100vh - var\(--cell-h, 60vh\) - (\d+)px\); \}/.exec(css)![1]) - 10;
    expect(sheet).toBeGreaterThan(rowTop);
    // horizontally: never under the attribution (bottom right); the row is at most the scale bar
    // (maxWidth + 10 px margin) + the widest readout ("90.00° S, 180.00° W": 20 chars of 10 px text)
    const widest = formatLatLon(-89.999, -179.999);
    const rowWidth = scaleMax + 10 + ml + 10 + 2 * 5 + widest.length * 6.5;
    const attribGap = Number(/\.maplibregl-ctrl-bottom-right \.maplibregl-ctrl-attrib \{ max-width: calc\(100vw - (\d+)px\); \}/.exec(css)![1]);
    expect(attribGap).toBeGreaterThan(rowWidth + 10); // + 10 px attribution margin
    expect(px(row, "max-width")).toMatch(/calc\(100% - \d+px\)/); // and the row itself never spans the map
    // the layer panel is no wider than the map minus the controls on narrow screens (unchanged)
    expect(css).toMatch(/--panel-w: calc\(100vw - 70px\)/);
  });
  it("DOM order does not matter: MapLibre inserts the readout before the scale bar, CSS order puts it to the right", () => {
    const box = document.createElement("div");
    box.className = "maplibregl-ctrl-bottom-left";
    const scale = document.createElement("div"); scale.className = "maplibregl-ctrl maplibregl-ctrl-scale";
    box.append(scale);
    const c = new CoordsControl({ touch: false });
    box.insertBefore(c.onAdd(fakeMap() as never), box.firstChild); // MapLibre's bottom-corner insertion
    expect([...box.children].map((e) => e.className)).toEqual(["maplibregl-ctrl atlas-coords", "maplibregl-ctrl maplibregl-ctrl-scale"]);
  });
  it("not part of image exports: exports draw the map canvas and the strip only; the strip has no cursor position", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../src/core/export/mapExport.ts"), "utf8");
    expect(src).toMatch(/map\.getCanvas\(\)/);
    expect(src).not.toMatch(/atlas-coords|querySelector\("\.maplibregl-ctrl/);
    const reg = loadRegistry().registry;
    const items = mapStripItems({ reg, width: 1300, includeBasemap: false, shareLink: "x", date: new Date(0), view: { lon: 15.21, lat: -24.53, zoom: 6, bearing: 0, pitch: 0, proj: "globe" },
      state: { layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: false, opacity: 1 }])) as never, order: [], utIndex: 14, dataset: "era5", basemap: "openfreemap-dark" } as never });
    // the only position in the strip is the view centre (the cursor readout is not passed to it)
    const pos = [...JSON.stringify(items).matchAll(/(\w+) [\d.]+° [NS], [\d.]+° [EW]/g)].map((m) => m[1]);
    expect(pos).toEqual(["centre"]);
  });
});
