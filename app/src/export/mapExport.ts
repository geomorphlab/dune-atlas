// "Export map image": the current view (same camera, projection, layers, order and styles) as a
// PNG at 1x / 2x without panels, controls or attribution, optionally without the basemap
// (transparent background), with the information strip BELOW the map. The strip content and the
// file name are pure (tested); capture and compositing run in the browser.
import type { Map as MlMap } from "maplibre-gl";
import type { LayerDef, Registry } from "../registry/types";
import type { AppState } from "../store";
import { effectiveDisplay, isAxis, vectorColors } from "../layerconfig";
import { legendTicks, tickLabel, tickPosition } from "../ui/legend";
import { texToPlain } from "../util/plaintext";
import { datasetInfo } from "../cell/datasetinfo";
import { MAP_DUNE_CREDIT, MAP_LAYER_CREDITS, windSourceText } from "@body/citation";
import { STRIP_UNITS, stripSvg, type StripItem } from "./strip";
import type { MathRenderer } from "./texsvg";
import { exportTitleTex, exportUnits, utTex } from "./labels";
import { blobWithDpi, EXPORT_DPI, mapExportPixelRatio, stripPlacement } from "./png";
import { isWindDerived } from "../map/dunemask";
import { announceDownload } from "../cell/downloads";

export interface MapView { lon: number; lat: number; zoom: number; bearing: number; pitch: number; proj: "globe" | "mercator" }
export interface MapStripContext {
  reg: Registry;
  state: Pick<AppState, "layers" | "order" | "utIndex" | "dataset" | "basemap" | "dunesOnly">;
  view: MapView;
  /** CSS px width of the image (the strip wraps to it) */
  width: number;
  includeBasemap: boolean;
  shareLink: string;
  date: Date;
}

/** default export background: white (transparent on request) */
export const EXPORT_BACKGROUND = "#ffffff";

const plain = (s: string | undefined) => texToPlain(s ?? "").replace(/\s+/g, " ").trim();
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const fmtLat = (v: number) => `${Math.abs(v).toFixed(2)}° ${v < 0 ? "S" : "N"}`;
const fmtLon = (v: number) => { const w = ((v + 540) % 360) - 180; return `${Math.abs(w).toFixed(2)}° ${w < 0 ? "W" : "E"}`; };

/** dune-atlas_map_<dataset>_<lat>_<lon>_z<zoom>_<date>.png */
export function mapExportFilename(dataset: string, v: Pick<MapView, "lat" | "lon" | "zoom">, date: Date): string {
  const lon = ((v.lon + 540) % 360) - 180;
  return `dune-atlas_map_${dataset}_${v.lat.toFixed(2)}_${lon.toFixed(2)}_z${v.zoom.toFixed(1)}_${isoDate(date)}.png`;
}

export const PROJECTION_TEXT = { globe: "Globe (perspective view)", mercator: "Web Mercator EPSG:3857" } as const;

/** Scale bar at the view centre (MapLibre: 512 px tiles), or null below zoom 2.5 where the scale
 *  varies strongly across the view. */
export function scaleBar(v: Pick<MapView, "lat" | "zoom">, maxPx = 120): { px: number; label: string } | null {
  if (v.zoom < 2.5) return null;
  const mpp = (40075016.686 * Math.cos((v.lat * Math.PI) / 180)) / (512 * 2 ** v.zoom);
  const maxM = mpp * maxPx;
  const p = 10 ** Math.floor(Math.log10(maxM));
  const m = [5, 2, 1].map((k) => k * p).find((x) => x <= maxM) ?? p;
  return { px: m / mpp, label: m >= 1000 ? `${m / 1000} km` : `${m} m` };
}

function colorbarFor(l: LayerDef, cfg: AppState["layers"][string]["cfg"], ut: number): StripItem {
  const e = effectiveDisplay(l, cfg);
  const deg = l.display?.transform === "rad-to-bearing" || l.display?.transform === "rad-to-axis";
  const ticks = legendTicks(l, cfg).map((v) => ({ pos: tickPosition(l, v, cfg), label: deg ? `${v}°` : tickLabel(v) }));
  // only what the bar does not show: units and the threshold (the ticks convey scale and limits)
  const detail = [exportUnits(l.units), l.thresholdAware ? `at ${utTex(ut)}` : ""].filter(Boolean).join(" · ");
  return { kind: "colorbar", title: exportTitleTex(l), detail, colors: e.colors, ticks };
}

/** strip line while Dunes only is on and a wind-derived layer is shown */
export const DUNES_ONLY_STRIP = "Dunes only: wind-derived layers shown in cells with dunes.";

/** Strip items for the active layers and the view: colour bars, legends and map keys first, then
 *  the descriptive text. */
export function mapStripItems(c: MapStripContext): StripItem[] {
  const { reg, state, view } = c;
  const ut = reg.threshold.values[state.utIndex];
  const ds = datasetInfo(state.dataset);
  const visible = [...new Set(state.order)].map((id) => reg.layers.find((l) => l.id === id)).filter((l): l is LayerDef => !!l && !!state.layers[l.id]?.visible);
  const anyThr = visible.some((l) => l.thresholdAware);
  const keys: StripItem[] = [];
  const sw: Extract<StripItem, { kind: "swatches" }>["items"] = [];
  for (const l of visible) {
    const cfg = state.layers[l.id]?.cfg;
    if (l.type === "zarr-field") {
      const e = effectiveDisplay(l, cfg);
      if (e.mode === "colormap") keys.push(colorbarFor(l, cfg, ut));
      else sw.push({ color: e.vecColor, shape: e.mode === "arrows" && !isAxis(l) ? "arrow" : "line", label: `${exportTitleTex(l)} (${e.mode}, ${isAxis(l) ? "orientation axis" : "direction of transport"})${l.thresholdAware ? ` at ${utTex(ut)}` : ""}` });
    } else {
      const v = vectorColors(l, cfg);
      sw.push({ color: v.fill, shape: "box", label: v.invert ? `${exportTitleTex(l)}: land without mapped dunes` : exportTitleTex(l) });
    }
  }
  if (sw.length) keys.push({ kind: "swatches", items: sw });
  // scale bar: at most 15 % of the image width; its length converted to strip units
  const sb0 = scaleBar(view, 0.15 * c.width);
  const sb = sb0 && { px: (sb0.px * STRIP_UNITS) / c.width, label: sb0.label };
  keys.push({ kind: "mapkeys", bearing: view.bearing, northNote: view.proj === "globe" ? "north up at view centre" : undefined,
    scale: sb, scaleNote: sb ? (view.proj === "globe" ? "at view centre" : `at ${fmtLat(view.lat)}`) : "Scale bar omitted: the scale varies strongly across this view" });
  const text: StripItem[] = [
    { kind: "heading", text: "Dune Atlas · map.geomorphlab.org" },
    { kind: "text", text: `${PROJECTION_TEXT[view.proj]} · centre ${fmtLat(view.lat)}, ${fmtLon(view.lon)} · zoom ${view.zoom.toFixed(1)} · wind dataset ${ds.name} ${ds.resolution}, ${ds.period}${anyThr ? ` · threshold friction velocity ${utTex(ut)}` : ""}` },
  ];
  // the Dunes only toggle changes what the wind-derived layers show: say so on the image
  if (state.dunesOnly && visible.some((l) => isWindDerived(l))) text.push({ kind: "text", text: DUNES_ONLY_STRIP });
  // sources: the paper, the wind dataset with its Copernicus notice, other external sources shown
  text.push({ kind: "text", text: MAP_DUNE_CREDIT });
  text.push({ kind: "text", text: windSourceText(state.dataset) });
  for (const [id, credit] of Object.entries(MAP_LAYER_CREDITS)) if (visible.some((l) => l.id === id)) text.push({ kind: "text", text: credit });
  const bm = reg.basemaps.find((b) => b.id === state.basemap);
  if (c.includeBasemap && bm) text.push({ kind: "text", text: `Basemap: ${bm.title}${bm.attribution ? `, ${plain(bm.attribution.replace(/<[^>]+>/g, ""))}` : ""}.` });
  text.push({ kind: "text", text: `View: ${c.shareLink}`, muted: true });
  text.push({ kind: "text", text: `Exported ${isoDate(c.date)} from the Dune Atlas.`, muted: true });
  return [...keys, ...text];
}

/** the strip for the map; `pxWidth` = pixel width of the exported image */
export function mapStripSvg(c: MapStripContext, pxWidth = STRIP_UNITS, math: MathRenderer | null = null) { return stripSvg(mapStripItems(c), { pxWidth, math }); }

// ---------------------------------------------------------------------------------------------
// Browser: capture and compose
// ---------------------------------------------------------------------------------------------

const waitIdle = (map: MlMap) => new Promise<void>((res) => { if (map.loaded() && !map.isMoving()) { map.once("idle", () => res()); map.triggerRepaint(); } else map.once("idle", () => res()); });

/** Capture the map canvas at `scale` (x CSS px; default: the export width, mapExportWidth). Basemap layers (and the selected-cell outline)
 *  are hidden while capturing when not wanted; everything is restored afterwards. */
export async function captureMap(map: MlMap, o: { scale?: number; includeBasemap: boolean; isOwnLayer: (id: string) => boolean; settle: () => Promise<void> }): Promise<HTMLCanvasElement> {
  const scale = o.scale ?? mapExportPixelRatio(map.getCanvas().clientWidth || map.getContainer().clientWidth);
  const hidden: string[] = [];
  for (const l of map.getStyle().layers) {
    const own = o.isOwnLayer(l.id);
    if (l.id.startsWith("selected-cell") || (!own && !o.includeBasemap)) {
      if (map.getLayoutProperty(l.id, "visibility") !== "none") { map.setLayoutProperty(l.id, "visibility", "none"); hidden.push(l.id); }
    }
  }
  const ratio = map.getPixelRatio();
  try {
    if (Math.abs(ratio - scale) > 1e-6) map.setPixelRatio(scale);
    await waitIdle(map);
    await o.settle();
    await new Promise((r) => setTimeout(r, 400)); // late raster regions / streamlines
    await waitIdle(map);
    return await new Promise<HTMLCanvasElement>((res) => {
      map.once("render", () => {
        const src = map.getCanvas();
        const c = document.createElement("canvas");
        c.width = src.width; c.height = src.height;
        c.getContext("2d")!.drawImage(src, 0, 0); // same frame: the drawing buffer is still valid
        res(c);
      });
      map.triggerRepaint();
    });
  } finally {
    if (Math.abs(map.getPixelRatio() - ratio) > 1e-6) map.setPixelRatio(ratio);
    for (const id of hidden) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible");
  }
}

/** Rasterise an SVG string (browser). */
export function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("could not render the information strip")); };
    img.src = url;
  });
}

/** map image on top, strip below (spanning the canvas's ACTUAL width, same factor on both axes),
 *  transparent wherever nothing is drawn; PNG tagged 300 dpi (pHYs: sets the print size only) */
export async function composeWithStrip(top: HTMLCanvasElement, stripFor: (pxWidth: number) => { svg: string; height: number }, o: { background?: string | null } = {}): Promise<{ blob: Blob; width: number; height: number }> {
  const strip = stripFor(top.width); // width/height attributes = the drawn size: rasterised 1:1
  const pl = stripPlacement(top, strip);
  const img = await svgToImage(strip.svg);
  const c = document.createElement("canvas");
  c.width = top.width;
  c.height = top.height + pl.height;
  const ctx = c.getContext("2d")!;
  const bg = o.background === undefined ? EXPORT_BACKGROUND : o.background;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(top, 0, 0);
  ctx.drawImage(img, pl.x, pl.y, pl.width, pl.height);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
  return { blob: await blobWithDpi(blob, EXPORT_DPI), width: c.width, height: c.height };
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  announceDownload(name);
}

/** Map PNG export request (camera button): basemap on/off, transparent background, progress stages */
export interface MapExportRequest { basemap: boolean; transparent?: boolean; onProgress?: (stage: string) => void }
/** progress messages for the map export: rendering can take 30-45 s with no other feedback */
export const EXPORT_STAGES = {
  capture: "Drawing the map at export resolution (loading tiles; this can take up to a minute)…",
  strip: "Adding colour bars, keys and sources…",
  encode: "Encoding the PNG…",
} as const;
/** Map export (map on top, strip below across the full width):
 *  capture, strip, white or transparent background, download, with progress stages; returns the file name and size. */
export async function exportMapPng(map: MlMap, d: {
  reg: Registry; state: MapStripContext["state"] & { projection: MapView["proj"] }; shareLink: string;
  settle: () => Promise<void>;
}, o: MapExportRequest): Promise<{ name: string; width: number; height: number }> {
  const c = map.getCenter();
  const view: MapView = { lon: c.lng, lat: c.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), proj: d.state.projection };
  const date = new Date(), cssWidth = map.getCanvas().clientWidth;
  o.onProgress?.(EXPORT_STAGES.capture);
  // one size: W = clamp(on-screen width x 1.5, 1600, 2400) px, text relative to W, tagged 300 dpi
  const canvas = await captureMap(map, { scale: mapExportPixelRatio(cssWidth), includeBasemap: o.basemap, isOwnLayer: (id) => id.startsWith("ov-"), settle: d.settle });
  o.onProgress?.(EXPORT_STAGES.strip);
  const { loadMathRenderer } = await import("./texsvg");
  const math = await loadMathRenderer(); // symbols as SVG paths (lazy chunk); null: plain text
  o.onProgress?.(EXPORT_STAGES.encode);
  const out = await composeWithStrip(canvas, (pxWidth) => mapStripSvg({ reg: d.reg, state: d.state, view, width: cssWidth, includeBasemap: o.basemap, shareLink: d.shareLink, date }, pxWidth, math),
    { background: o.transparent ? null : EXPORT_BACKGROUND });
  const name = mapExportFilename(d.state.dataset, view, date);
  downloadBlob(name, out.blob);
  return { name, width: out.width, height: out.height };
}
