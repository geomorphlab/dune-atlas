// @vitest-environment happy-dom
// Dune-field name labels (map/placelabels.ts), prepared for Earth: a fixture place list with two-line
// names in non-Latin scripts (Arabic, Persian, Urdu: right to left; Chinese: CJK; Cyrillic; Tibetan) -
// the deployed list is tests/earthplaces.test.ts. Style layer validity, zoom thresholds and priority
// by size, line 2 and the scripts drawn on the map, the lazy RTL plugin, the layer's place in the stack,
// visibility and tone, label clicks and the popup, state in links, the toggle and the map export.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import {
  BASEMAP_LABELS_KEPT, dotImage, DOT, ensureRtlPlugin, isRtl, LABEL_STYLE, LABEL_ZOOM, LINE2_SMALLER, PLACE_DOT, labelMinZoom, labelSize, LOCAL_IDEOGRAPH_FONTS, mapDrawable, PLACE_LABELS, PLACE_SOURCE,
  placeFeatures, placeLabelLayer, PlaceLabels, placePopupContent, placesNeedRtl,
} from "../src/core/map/placelabels";
import { firstSymbolLayer, SELECTED_CELL_BOTTOM } from "../src/core/map/overlays";
import { loadPlaces, type Place, type PlaceList } from "../src/core/search/places";
import { decodeShare, encodeShare, shareToUrlState, type ShareState } from "../src/core/share/shortlink";
import { parseUrlState, serializeUrlState } from "../src/core/urlstate";
import { initialAppState, appShareState } from "../src/core/defaultview";
import { loadRegistry } from "../src/core/registry/load";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import { Store } from "../src/core/store";
import { mapStripItems } from "../src/core/export/mapExport";

const P = (o: Partial<Place> & { id: string; line1: string }): Place => ({ lat: 0, lon: 0, radius_km: 50, sources: ["fixture"], ...o });
const FIXTURE: PlaceList = {
  enabled: true,
  places: [
    P({ id: "rub-al-khali", line1: "Rubʿ al Khali", line2: { text: "الربع الخالي", lang: "ar" }, aliases: ["Empty Quarter"], countries: ["Saudi Arabia", "Oman", "United Arab Emirates", "Yemen"], lat: 20, lon: 50, radius_km: 500, dune_km2: 560000 }),
    P({ id: "dasht-e-lut", line1: "Dasht-e Lut", line2: { text: "دشت لوت", lang: "fa" }, countries: ["Iran"], lat: 30.5, lon: 58.5, radius_km: 150 }),
    P({ id: "thar", line1: "Thar Desert", line2: { text: "صحرائے تھر", lang: "ur" }, countries: ["India", "Pakistan"], lat: 27, lon: 71, radius_km: 400 }),
    P({ id: "taklamakan", line1: "Taklamakan Desert", line2: { text: "塔克拉玛干沙漠", lang: "zh-Hans" }, countries: ["China"], lat: 39, lon: 83, radius_km: 400 }),
    P({ id: "ryn-peski", line1: "Ryn Peski", line2: { text: "Рын-пески", lang: "ru" }, countries: ["Kazakhstan", "Russia"], lat: 47.5, lon: 49, radius_km: 120 }),
    P({ id: "tibet-field", line1: "Tibetan dune field", line2: { text: "བྱེ་ཐང་", lang: "bo" }, countries: ["China"], lat: 29.3, lon: 89.5, radius_km: 25 }),
    P({ id: "dateline", line1: "Dateline sands", lat: -10, lon: 179.9, radius_km: 30 }),
  ],
};
const EARTH_R = 6371;

describe("label features", () => {
  const fc = placeFeatures(FIXTURE);
  const f = (id: string) => fc.features.find((x) => x.properties!.id === id)!;
  it("one point per place at its centre (longitudes -180..180)", () => {
    expect(fc.features).toHaveLength(FIXTURE.places.length);
    expect(f("rub-al-khali").geometry.coordinates).toEqual([50, 20]);
    expect(f("dateline").geometry.coordinates).toEqual([179.9, -10]);
    expect(placeFeatures({ enabled: true, places: [P({ id: "x", line1: "X", lon: 354.8 })] }).features[0].geometry.coordinates[0]).toBeCloseTo(-5.2, 6);
  });
  it("larger features: lower zoom threshold, larger text, placed first", () => {
    expect(f("rub-al-khali").properties!.minzoom).toBe(0);   // large fields from the whole-globe view
    expect(f("dasht-e-lut").properties!.minzoom).toBe(0);
    expect(f("dasht-e-lut").properties!.minzoom).toBeLessThan(f("dateline").properties!.minzoom);
    expect(f("dateline").properties!.minzoom).toBeLessThan(f("tibet-field").properties!.minzoom);
    expect(f("rub-al-khali").properties!.rank).toBeLessThan(f("thar").properties!.rank);   // 500 km before 400 km
    expect(f("thar").properties!.rank).toBeLessThan(f("dateline").properties!.rank);
    expect(labelSize(10)).toBe(13);
    expect(labelSize(400)).toBe(20);
    expect(labelSize(10000)).toBe(20);
    expect(labelSize(100)).toBeGreaterThan(13);
    expect(labelMinZoom(LABEL_ZOOM.rAll)).toBe(0);
    expect(labelMinZoom(1e5)).toBe(0);
    expect(labelMinZoom(LABEL_ZOOM.rLast)).toBe(LABEL_ZOOM.max);
    expect(labelMinZoom(0.01)).toBe(LABEL_ZOOM.max);
    expect(LABEL_ZOOM.max).toBeLessThanOrEqual(5);   // every name by zoom 4-5
  });
  it("line 2 in Arabic, Persian, Urdu, Chinese and Cyrillic on the map; Tibetan only in the popup", () => {
    for (const id of ["rub-al-khali", "dasht-e-lut", "thar", "taklamakan", "ryn-peski"]) expect(f(id).properties!.line2, id).toBe(FIXTURE.places.find((p) => p.id === id)!.line2!.text);
    expect(f("tibet-field").properties!.line2).toBeUndefined();
    expect(mapDrawable("བྱེ་ཐང་")).toBe(false);
    expect(mapDrawable("塔克拉玛干沙漠")).toBe(true);
    expect(isRtl("دشت لوت")).toBe(true);
    expect(isRtl("Рын-пески")).toBe(false);
    expect(placePopupContent(FIXTURE.places[5]).querySelector(".place-line2")!.textContent).toBe("བྱེ་ཐང་");
  });
  it("RTL names: the RTL text plugin is registered once, lazily; CJK drawn from local fonts", () => {
    expect(placesNeedRtl(FIXTURE)).toBe(true);
    expect(placesNeedRtl({ enabled: true, places: [FIXTURE.places[3], FIXTURE.places[4]] })).toBe(false);
    const set = vi.fn(async () => {});
    expect(ensureRtlPlugin(set, "/assets/mapbox-gl-rtl-text.js")).toBe(true);
    expect(ensureRtlPlugin(set, "/assets/mapbox-gl-rtl-text.js")).toBe(false);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith("/assets/mapbox-gl-rtl-text.js", true);
    expect(LOCAL_IDEOGRAPH_FONTS).toMatch(/sans-serif$/);
    // bundled with the app (no third-party CDN)
    const main = fs.readFileSync(path.resolve(__dirname, "../src/main.ts"), "utf8");
    expect(main).toMatch(/import rtlPluginUrl from "\.\.\/node_modules\/@mapbox\/mapbox-gl-rtl-text\/dist\/mapbox-gl-rtl-text\.js\?url"/);
    expect(main).toContain("localIdeographFontFamily: LOCAL_IDEOGRAPH_FONTS");
    expect(main).not.toMatch(/unpkg|jsdelivr|cdnjs/);
  });
});

describe("label layer", () => {
  it("is a valid style layer: italic font, size by feature, priority by size, zoom threshold, halo", () => {
    const style = { version: 8, glyphs: "https://example.org/{fontstack}/{range}.pbf", sources: { [PLACE_SOURCE]: { type: "geojson", data: placeFeatures(FIXTURE) } }, layers: [placeLabelLayer(true, "dark")] };
    expect(validateStyleMin(style as never)).toEqual([]);
    const l = placeLabelLayer(false, "light");
    expect(l.layout["text-font"]).toEqual(["Noto Sans Italic"]);
    expect(l.layout["symbol-sort-key"]).toEqual(["get", "rank"]);
    expect(l.layout.visibility).toBe("none");
    expect(l.filter).toEqual([">=", ["zoom"], ["get", "minzoom"]]);
    expect(JSON.stringify(l.layout["text-field"])).toContain(`"font-scale":["/",["-",["get","size"],${LINE2_SMALLER}],["get","size"]]`);   // line 2 2 px smaller
    expect(l.layout["icon-image"]).toBe(PLACE_DOT);   // the centre dot, beside which the name sits
    expect(l.layout["text-variable-anchor"]).toEqual(["left", "right", "top", "bottom"]);
    expect(l.layout["text-padding"]).toBeLessThanOrEqual(1);
    expect(l.paint["icon-color"]).toBe(l.paint["text-color"]);
    expect(l.paint["text-halo-width"]).toBeGreaterThanOrEqual(2);
    expect(l.paint["text-color"]).toBe(LABEL_STYLE.light.text);
    expect(LABEL_STYLE.dark.text).toBe("#e8d3a8");
  });
});

/** a fake map: the style's layer list, sources, layout/paint, rendered features at a point */
function fakeMap(layers: { id: string; type: string }[]) {
  const ls = [...layers];
  const layout: Record<string, Record<string, unknown>> = {}, paint: Record<string, Record<string, unknown>> = {};
  const sources: Record<string, unknown> = {};
  const handlers: Record<string, (() => void)[]> = {};
  let rendered: { properties: Record<string, unknown> }[] = [];
  const canvas = document.createElement("canvas");
  const map = {
    ls, layout, paint, canvas, setRendered: (r: typeof rendered) => { rendered = r; },
    fitBounds: vi.fn(),
    getStyle: () => ({ layers: ls }),
    getLayer: (id: string) => ls.find((l) => l.id === id),
    getSource: (id: string) => sources[id],
    addSource: (id: string, s: unknown) => { sources[id] = s; },
    addLayer: (spec: { id: string; type: string; layout?: Record<string, unknown>; paint?: Record<string, unknown> }, before?: string) => {
      const i = before ? ls.findIndex((l) => l.id === before) : -1;
      ls.splice(i < 0 ? ls.length : i, 0, { id: spec.id, type: spec.type });
      layout[spec.id] = { ...spec.layout }; paint[spec.id] = { ...spec.paint };
    },
    setLayoutProperty: (id: string, k: string, v: unknown) => { (layout[id] ??= {})[k] = v; },
    setPaintProperty: (id: string, k: string, v: unknown) => { paint[id][k] = v; },
    images: new Map<string, unknown>(),
    hasImage(id: string) { return map.images.has(id); },
    addImage(id: string, img: unknown, o: unknown) { map.images.set(id, { img, o }); },
    getLayoutProperty: (id: string, k: string) => layout[id]?.[k],
    queryRenderedFeatures: vi.fn(() => rendered),
    getCanvas: () => canvas,
    on: (ev: string, layer: string, f: () => void) => { (handlers[`${ev}:${layer}`] ??= []).push(f); },
    fire: (k: string) => handlers[k]?.forEach((f) => f()),
  };
  return map;
}
function fakePopup() {
  const p = { lngLat: null as unknown, content: null as HTMLElement | null, open: false, focus: undefined as boolean | undefined,
    setLngLat(ll: unknown) { p.lngLat = ll; return p; }, setDOMContent(el: HTMLElement) { p.content = el; return p; },
    addTo() { p.open = true; return p; }, remove() { p.open = false; return p; }, isOpen() { return p.open; } };
  return p;
}

describe("PlaceLabels on a map", () => {
  const setup = (list: PlaceList = FIXTURE, tone: "dark" | "light" = "dark") => {
    const map = fakeMap([{ id: "background", type: "background" }, { id: "ov-dpm", type: "custom" }, { id: SELECTED_CELL_BOTTOM, type: "fill" }, { id: "selected-cell-line", type: "line" }, { id: "place-country", type: "symbol" }]);
    const popups: ReturnType<typeof fakePopup>[] = [];
    let t = tone;
    const pl = new PlaceLabels(map as never, { list, bodyRadiusKm: EARTH_R, tone: () => t, popup: (focus) => { const p = fakePopup(); p.focus = focus; popups.push(p); return p as never; } });
    return { map, pl, popups, setTone: (x: "dark" | "light") => { t = x; } };
  };
  it("attached above the data layers and below the selected-cell highlight and the basemap labels", () => {
    const { map, pl } = setup();
    pl.attach();
    const ids = map.ls.map((l) => l.id);
    expect(ids.indexOf(PLACE_LABELS)).toBe(ids.indexOf(SELECTED_CELL_BOTTOM) - 1);
    expect(ids.indexOf(PLACE_LABELS)).toBeGreaterThan(ids.indexOf("ov-dpm"));
    expect(firstSymbolLayer(map as never)).toBe("place-country");   // the basemap's labels, not the names
    pl.attach();   // idempotent (style.load after a basemap switch re-adds them)
    expect(map.ls.filter((l) => l.id === PLACE_LABELS)).toHaveLength(1);
  });
  it("hidden by default; the toggle shows them; the basemap tone sets the colours", () => {
    const { map, pl } = setup(FIXTURE, "light");
    pl.attach();
    expect(map.layout[PLACE_LABELS].visibility).toBe("none");
    pl.setVisible(true);
    expect(map.layout[PLACE_LABELS].visibility).toBe("visible");
    expect(map.paint[PLACE_LABELS]["text-color"]).toBe(LABEL_STYLE.light.text);
    pl.setTone("dark");
    expect(map.paint[PLACE_LABELS]["text-halo-color"]).toBe(LABEL_STYLE.dark.halo);
  });
  it("a click on a label opens its popup and flies there; a click elsewhere (or with the names hidden) is the cell's", () => {
    const { map, pl, popups } = setup();
    pl.attach();
    map.setRendered([{ properties: { id: "rub-al-khali" } }]);
    expect(pl.onClick({ point: { x: 1, y: 2 } } as never)).toBe(false);   // hidden: not queried
    pl.setVisible(true);
    expect(pl.onClick({ point: { x: 1, y: 2 } } as never)).toBe(true);
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ x: 1, y: 2 }, { layers: [PLACE_LABELS] });
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    expect(popups[0].lngLat).toEqual([50, 20]);
    expect(popups[0].focus).toBe(true);
    expect(pl.popupOpen).toBe(true);
    map.setRendered([]);
    expect(pl.onClick({ point: { x: 9, y: 9 } } as never)).toBe(false);
    pl.closePopup();
    expect(pl.popupOpen).toBe(false);
  });
  it("search picks open the popup without moving the focus", () => {
    const { pl, popups } = setup();
    pl.show(FIXTURE.places[3], { focus: false });
    expect(popups[0].focus).toBe(false);
  });
  it("pointer cursor over a label, crosshair elsewhere", () => {
    const { map } = setup();
    map.fire(`mouseenter:${PLACE_LABELS}`);
    expect(map.canvas.style.cursor).toBe("pointer");
    map.fire(`mouseleave:${PLACE_LABELS}`);
    expect(map.canvas.style.cursor).toBe("crosshair");
  });
  it("the centre dot: an SDF disc image, added once per style", () => {
    const { map, pl } = setup();
    pl.attach();
    expect(map.images.get(PLACE_DOT)).toMatchObject({ o: { sdf: true } });
    const img = dotImage(), c = Math.floor(DOT.size / 2);
    expect(img.data.length).toBe(DOT.size * DOT.size * 4);
    expect(img.data[(c * DOT.size + c) * 4 + 3]).toBe(255);   // inside
    expect(img.data[3]).toBe(0);                              // the corner: beyond the halo range
    const edge = Math.round(c + DOT.radius);
    expect(img.data[(c * DOT.size + edge) * 4 + 3]).toBeGreaterThan(150);   // about 0.75 at the edge
  });
  it("while shown, the basemap's labels other than countries and states give way; restored when hidden", () => {
    const { map, pl } = setup();
    map.ls.push({ id: "place_city", type: "symbol" }, { id: "water_name", type: "symbol" }, { id: "place_state", type: "symbol" }, { id: "place_country_major", type: "symbol" }, { id: "poi_hidden", type: "symbol" });
    map.layout["poi_hidden"] = { visibility: "none" };
    pl.attach();
    pl.setVisible(true);
    expect([...pl.yielded].sort()).toEqual(["place-country", "place_city", "water_name"].sort().filter((x) => !BASEMAP_LABELS_KEPT.test(x)));
    expect(map.layout["place_city"].visibility).toBe("none");
    expect(map.layout["place_state"]?.visibility).toBeUndefined();
    expect(map.layout["place_country_major"]?.visibility).toBeUndefined();
    pl.setVisible(false);
    expect(map.layout["place_city"].visibility).toBe("visible");
    expect(map.layout["water_name"].visibility).toBe("visible");
    expect(map.layout["poi_hidden"].visibility).toBe("none");   // hidden by the style itself: left alone
    expect(pl.yielded).toEqual([]);
    pl.setVisible(true);
    pl.attach();   // a basemap switch: the new style's labels give way too
    expect(map.layout["place_city"].visibility).toBe("none");
  });
  it("nothing is added for a disabled or empty list", () => {
    const { map, pl } = setup({ enabled: false, places: FIXTURE.places });
    pl.attach();
    pl.setVisible(true);
    expect(map.getLayer(PLACE_LABELS)).toBeUndefined();
    expect(pl.visible).toBe(false);
  });
});

describe("popup", () => {
  it("name, line 2 (language, direction), countries, aliases, dune area and linked sources", () => {
    const el = placePopupContent({ ...FIXTURE.places[0], sources: ["Fixture gazetteer, https://example.org/names/", "https://example.org/feature/1"] });
    expect(el.querySelector(".place-name")!.textContent).toBe("Rubʿ al Khali");
    const l2 = el.querySelector(".place-line2")!;
    expect([l2.textContent, l2.getAttribute("lang"), l2.getAttribute("dir")]).toEqual(["الربع الخالي", "ar", "auto"]);
    expect(el.querySelector(".place-meta")!.textContent).toBe("Saudi Arabia, Oman, United Arab Emirates, Yemen");
    expect(el.textContent).toContain("Also called: Empty Quarter");
    expect(el.textContent).toContain("Mapped dune area: 560,000 km²");
    const a = [...el.querySelectorAll("a")];
    expect(a.map((x) => x.getAttribute("href"))).toEqual(["https://example.org/names/", "https://example.org/feature/1"]);
    expect(a.every((x) => x.getAttribute("rel") === "noopener")).toBe(true);
  });
});

describe("'Show names' state", () => {
  const reg = loadRegistry().registry;
  it("in ?query links (names=1) and short links (flag 64), backwards compatible", () => {
    expect(parseUrlState("?lon=1&lat=2&names=1").names).toBe(true);
    expect(parseUrlState("?lon=1&lat=2").names).toBeUndefined();
    expect(serializeUrlState({ lon: 1, lat: 2, names: true })).toContain("names=1");
    const base: ShareState = { lon: 10, lat: 20, zoom: 3, proj: "globe", dataset: "era5", basemap: "openfreemap-dark", ut: 14, layers: [{ id: "dunes", opacity: 1 }] };
    const on = encodeShare({ ...base, names: true }), off = encodeShare(base);
    expect(decodeShare(on)!.names).toBe(true);
    expect(decodeShare(off)!.names).toBeUndefined();
    expect(on.length).toBe(off.length);   // a flag bit, no payload
    expect(shareToUrlState(decodeShare(on)!).names).toBe(true);
    const st = initialAppState(reg, { ...shareToUrlState(decodeShare(on)!) }, "era5");
    expect(st.names).toBe(true);
    expect(appShareState(st, { lon: 10, lat: 20, zoom: 3 }, true).names).toBe(true);
    expect(initialAppState(reg, shareToUrlState(decodeShare(off)!), "era5").names).toBeUndefined();
  });
  it("Earth: the toggle with the place list enabled, off by default", () => {
    expect(loadPlaces().enabled).toBe(true);
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const st = initialAppState(reg, {}, "era5");
    renderLayerPanel(document.getElementById("layer-panel")!, reg, new Store(st));
    expect((document.getElementById("show-names") as HTMLInputElement).checked).toBe(false);
  });
  it("Earth: every basemap states its tone (dune-name colours)", () => {
    for (const b of reg.basemaps) expect(["dark", "light"], b.id).toContain(b.tone);
    expect(reg.basemaps.find((b) => b.id === "openfreemap-dark")!.tone).toBe("dark");
    expect(reg.basemaps.find((b) => b.id === "esri-imagery")!.tone).toBe("light");
    expect(reg.basemaps.find((b) => b.id === "openfreemap-light")!.tone).toBe("light");
  });
  it("map export: the names' source line while they are shown", () => {
    const st = initialAppState(reg, {}, "era5");
    const ctx = { reg, view: { lon: 0, lat: 0, zoom: 2, bearing: 0, pitch: 0, proj: "globe" as const }, width: 1000, includeBasemap: true, shareLink: "x", date: new Date(0), namesCredit: "Feature names: fixture." };
    const txt = (names: boolean) => mapStripItems({ ...ctx, state: { ...st, names } }).filter((i) => i.kind === "text").map((i) => (i as { text: string }).text);
    expect(txt(true)).toContain("Feature names: fixture.");
    expect(txt(false)).not.toContain("Feature names: fixture.");
  });
});
