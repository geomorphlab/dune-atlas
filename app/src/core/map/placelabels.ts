// Dune-field name labels ('Show names' in the Dunes group): a MapLibre symbol layer over a GeoJSON built from
// the body's place list (registry/<body>/places.yaml, the same list as the search box). Large features
// first: each label appears once its feature (labelRadius: radius and mapped dune area) is about LABEL_PX
// pixels across, and collisions are resolved by that size (symbol-sort-key). Italic, pale sand on dark basemaps and dark brown on light ones (registry
// basemaps[].tone), with a soft halo. The layer sits above the data layers and below the selected-cell
// highlight; basemap labels stay above it (MapLibre places the upper layer's symbols first, so the two
// never overlap). A click on a label (only on the label: cell clicks elsewhere are unchanged) or a pick in
// the search box flies to the feature and opens a popup with its details and sources.
//
// Glyphs: styles without a glyph server (every Mars basemap, Earth's raster ones) draw every glyph from
// the visitor's system fonts (MapLibre local glyph rendering, italic sniffed from the font name); the
// OpenFreeMap styles serve "Noto Sans Italic" (Latin, Cyrillic, Arabic ranges). CJK is always drawn
// locally (map option localIdeographFontFamily); Arabic, Persian and Urdu need the RTL text plugin
// (bundled with the app and loaded lazily, only for a place list with right-to-left names). Scripts that
// need complex shaping MapLibre does not do (e.g. Tibetan, Devanagari, Mongolian) keep line 2 for the
// popup only.
import type { GeoJSONSource, Map as MlMap, MapMouseEvent, PointLike, Popup } from "maplibre-gl";
import { placeBounds, placesAvailable, PLACE_TEXT, type Place, type PlaceList } from "../search/places";
export { PLACE_TEXT };
import { h } from "../ui/dom";
import { PLACE_LABELS, SELECTED_CELL_BOTTOM, firstSymbolLayer } from "./overlays";

export { PLACE_LABELS };
export const PLACE_SOURCE = "place-labels-src";
/** font stack of the labels: served by the OpenFreeMap glyph server; elsewhere a CSS family (italic) */
export const PLACE_LABEL_FONT = ["Noto Sans Italic"];
/** map option localIdeographFontFamily: CJK glyphs drawn from local fonts */
export const LOCAL_IDEOGRAPH_FONTS = "'Noto Sans CJK SC', 'Noto Sans SC', 'PingFang SC', 'Hiragino Sans', 'Microsoft YaHei', 'Source Han Sans SC', sans-serif";
/** a label shows once its feature is this many pixels across */
export const LABEL_PX = 48;
export const LABEL_MAX_MINZOOM = 9;
/** text size range (px) from the smallest to the largest features */
export const LABEL_SIZE = { min: 10, max: 14, rSmall: 10, rLarge: 400 } as const;
export const LABEL_STYLE = {
  dark: { text: "#e8d3a8", halo: "rgba(14, 11, 8, 0.82)" },
  light: { text: "#4a2e12", halo: "rgba(255, 248, 236, 0.85)" },
} as const;
export type Tone = keyof typeof LABEL_STYLE;


/** characters of scripts that need complex shaping MapLibre labels do not do (line 2 then goes to the popup only) */
const COMPLEX = /[\u0900-\u0DFF\u0E00-\u0FFF\u1000-\u109F\u1780-\u18AF\u1900-\u1A1F\u1B00-\u1BFF\uA8E0-\uA8FF]/u;
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
export const mapDrawable = (s: string) => !COMPLEX.test(s);
export const isRtl = (s: string) => RTL.test(s);

/** the size a label is scaled by (km): the geometric mean of the feature's radius and the radius of a disc of
 *  its mapped dune area, so big ergs come first and a large feature with few dunes does not */
export function labelRadius(p: Pick<Place, "radius_km" | "dune_km2">): number {
  return p.dune_km2 ? Math.sqrt(p.radius_km * Math.sqrt(p.dune_km2 / Math.PI)) : p.radius_km;
}
/** zoom at which a feature of radius `radiusKm` is LABEL_PX pixels across (512 px world at zoom 0) */
export function labelMinZoom(radiusKm: number, bodyRadiusKm: number): number {
  const diamDeg = ((2 * radiusKm) / bodyRadiusKm) * (180 / Math.PI);
  const z = Math.log2((LABEL_PX * 360) / (512 * diamDeg));
  return Math.round(Math.max(0, Math.min(LABEL_MAX_MINZOOM, z)) * 100) / 100;
}
/** text size (px), log-scaled with the radius */
export function labelSize(radiusKm: number): number {
  const { min, max, rSmall, rLarge } = LABEL_SIZE;
  const t = (Math.log(radiusKm) - Math.log(rSmall)) / (Math.log(rLarge) - Math.log(rSmall));
  return Math.round((min + (max - min) * Math.max(0, Math.min(1, t))) * 10) / 10;
}

/** GeoJSON of the labels: a point per place with its label lines, zoom threshold, size and priority */
export function placeFeatures(list: PlaceList, bodyRadiusKm: number): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: list.places.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon > 180 ? p.lon - 360 : p.lon, p.lat] },
      properties: {
        id: p.id, line1: p.line1,
        ...(p.line2 && mapDrawable(p.line2.text) ? { line2: p.line2.text } : {}),
        minzoom: labelMinZoom(labelRadius(p), bodyRadiusKm),
        size: labelSize(labelRadius(p)),
        // lower keys are placed first: larger (labelRadius), then larger mapped dune areas
        rank: -(labelRadius(p) * 1e6 + (p.dune_km2 ?? 0)) / 1e6,
      },
    })),
  };
}

/** the symbol layer (style-spec layer object) */
export function placeLabelLayer(visible: boolean, tone: Tone) {
  const s = LABEL_STYLE[tone];
  return {
    id: PLACE_LABELS, type: "symbol" as const, source: PLACE_SOURCE,
    filter: [">=", ["zoom"], ["get", "minzoom"]],
    layout: {
      "text-field": ["format", ["get", "line1"], {},
        ["case", ["has", "line2"], ["concat", "\n", ["get", "line2"]], ""], { "font-scale": 0.86 }],
      "text-font": PLACE_LABEL_FONT,
      "text-size": ["get", "size"],
      "text-letter-spacing": 0.03,
      "text-line-height": 1.15,
      "text-max-width": 10,
      "text-padding": 4,
      "text-anchor": "center",
      "text-justify": "center",
      "symbol-sort-key": ["get", "rank"],
      "text-rotation-alignment": "viewport",
      "text-pitch-alignment": "viewport",
      visibility: visible ? "visible" : "none",
    },
    paint: { "text-color": s.text, "text-halo-color": s.halo, "text-halo-width": 1.3, "text-halo-blur": 0.8 },
  };
}

/** the label's popup content: name, line 2, feature type or countries, aliases, mapped dune area, sources */
export function placePopupContent(p: Place): HTMLElement {
  const rows: HTMLElement[] = [h("p", { class: "place-name" }, p.line1)];
  if (p.line2) rows.push(h("p", { class: "place-line2", lang: p.line2.lang, dir: "auto" }, p.line2.text));
  const meta = [p.type, p.countries?.length ? p.countries.join(", ") : undefined].filter(Boolean).join(" · ");
  if (meta) rows.push(h("p", { class: "place-meta" }, meta));
  // other names: the alternative names with their notes (script, meaning, language); else the aliases
  if (p.alt_names?.length) {
    rows.push(h("p", { class: "place-row" }, `${PLACE_TEXT.aliases}:`),
      h("ul", { class: "place-alt" }, ...p.alt_names.map((a) => h("li", {}, h("span", { dir: "auto" }, a.text), ...(a.note ? [" ", h("span", { class: "place-note" }, `(${a.note})`)] : [])))));
  } else if (p.aliases?.length) rows.push(h("p", { class: "place-row" }, `${PLACE_TEXT.aliases}: ${p.aliases.join(", ")}`));
  if (p.includes?.length) rows.push(h("p", { class: "place-row" }, `${PLACE_TEXT.includes}: ${p.includes.join(", ")}`));
  if (p.dune_km2 !== undefined) rows.push(h("p", { class: "place-row" }, `${PLACE_TEXT.dunes}: ${Math.round(p.dune_km2).toLocaleString("en-GB")} km²`));
  const src = h("ul", { class: "place-sources" }, ...p.sources.map((s) => h("li", {}, ...linkify(s))));
  rows.push(h("p", { class: "place-row place-src-head" }, `${PLACE_TEXT.sources}:`), src);
  return h("div", { class: "place-popup-body" }, ...rows);
}
function linkify(s: string): (string | HTMLElement)[] {
  const out: (string | HTMLElement)[] = [];
  let last = 0;
  for (const m of s.matchAll(/https?:\/\/[^\s,;]+/g)) {
    if (m.index! > last) out.push(s.slice(last, m.index));
    out.push(h("a", { href: m[0], target: "_blank", rel: "noopener" }, m[0].replace(/^https?:\/\//, "").replace(/\/$/, "")));
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** lazy RTL text plugin (self-hosted asset of the build): registered once, loaded by MapLibre when RTL text is drawn */
let rtlRequested = false;
export function ensureRtlPlugin(setPlugin: (url: string, lazy: boolean) => Promise<void>, url: string): boolean {
  if (rtlRequested) return false;
  rtlRequested = true;
  void setPlugin(url, true).catch((e) => console.warn("[dune-atlas] RTL text plugin", e));
  return true;
}
export const placesNeedRtl = (list: PlaceList) => list.places.some((p) => !!p.line2 && isRtl(p.line2.text) && mapDrawable(p.line2.text));

export interface PlaceLabelOptions {
  list: PlaceList;
  bodyRadiusKm: number;
  tone: () => Tone;
  /** makes a popup (maplibregl.Popup); `focus`: focus it once open (focusAfterOpen) */
  popup: (focus: boolean) => Popup;
  /** the map's resting cursor */
  cursor?: string;
}

/** The labels on one map: (re)attached on every style load, toggled, re-coloured for the basemap's tone. */
export class PlaceLabels {
  readonly data: GeoJSON.FeatureCollection<GeoJSON.Point>;
  #visible = false;
  #popup: Popup | null = null;
  #byId: Map<string, Place>;
  constructor(private map: MlMap, private o: PlaceLabelOptions) {
    this.data = placeFeatures(o.list, o.bodyRadiusKm);
    this.#byId = new Map(o.list.places.map((p) => [p.id, p]));
    map.on("mouseenter", PLACE_LABELS, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", PLACE_LABELS, () => { map.getCanvas().style.cursor = o.cursor ?? "crosshair"; });
  }
  get available() { return placesAvailable(this.o.list); }
  get visible() { return this.#visible; }

  /** after a style load: source and layer above the data layers, below the selected-cell highlight */
  attach() {
    if (!this.available) return;
    const m = this.map;
    if (!m.getSource(PLACE_SOURCE)) m.addSource(PLACE_SOURCE, { type: "geojson", data: this.data });
    if (!m.getLayer(PLACE_LABELS)) {
      const before = m.getLayer(SELECTED_CELL_BOTTOM) ? SELECTED_CELL_BOTTOM : firstSymbolLayer(m);
      m.addLayer(placeLabelLayer(this.#visible, this.o.tone()) as never, before);
    }
    this.setTone(this.o.tone());
  }
  setVisible(on: boolean) {
    this.#visible = on && this.available;
    if (this.map.getLayer(PLACE_LABELS)) this.map.setLayoutProperty(PLACE_LABELS, "visibility", this.#visible ? "visible" : "none");
  }
  setTone(tone: Tone) {
    if (!this.map.getLayer(PLACE_LABELS)) return;
    this.map.setPaintProperty(PLACE_LABELS, "text-color", LABEL_STYLE[tone].text);
    this.map.setPaintProperty(PLACE_LABELS, "text-halo-color", LABEL_STYLE[tone].halo);
  }
  /** the place whose label is under the point (none while hidden) */
  hit(point: PointLike): Place | null {
    if (!this.#visible || !this.map.getLayer(PLACE_LABELS)) return null;
    const f = this.map.queryRenderedFeatures(point, { layers: [PLACE_LABELS] })[0];
    const id = f?.properties?.id as string | undefined;
    return id ? this.#byId.get(id) ?? null : null;
  }
  /** fly to the feature's extent and open its popup (`focus`: move the keyboard focus into it, as for a click) */
  show(p: Place, o: { fly?: boolean; focus?: boolean } = {}) {
    if (o.fly !== false) this.map.fitBounds(placeBounds(p, this.o.bodyRadiusKm), { padding: 40, maxZoom: 9, essential: true });
    this.#popup?.remove();
    this.#popup = this.o.popup(o.focus !== false).setLngLat([p.lon > 180 ? p.lon - 360 : p.lon, p.lat]).setDOMContent(placePopupContent(p)).addTo(this.map);
  }
  get popupOpen() { return !!this.#popup?.isOpen(); }
  closePopup() { this.#popup?.remove(); this.#popup = null; }
  /** a click on a label: true when handled (the cell click is skipped) */
  onClick(e: Pick<MapMouseEvent, "point">): boolean {
    const p = this.hit(e.point);
    if (!p) return false;
    this.show(p);
    return true;
  }
  /** the GeoJSON source (tests) */
  source(): GeoJSONSource | undefined { return this.map.getSource(PLACE_SOURCE) as GeoJSONSource | undefined; }
}
