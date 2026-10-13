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
import { C3S_NOTICE, C3S_NOTICE_ERA5, ERA5_DOI, ERA5_PAPER_DOI, ERA5LAND_DOI, ERA5LAND_PAPER_DOI, PAPER_DOI } from "../cell/citation";
import { stripSvg, type StripItem } from "./strip";

export interface MapView { lon: number; lat: number; zoom: number; bearing: number; pitch: number; proj: "globe" | "mercator" }
export interface MapStripContext {
  reg: Registry;
  state: Pick<AppState, "layers" | "order" | "utIndex" | "dataset" | "basemap">;
  view: MapView;
  /** CSS px width of the image (the strip wraps to it) */
  width: number;
  includeBasemap: boolean;
  shareLink: string;
  date: Date;
}

const plain = (s: string | undefined) => texToPlain(s ?? "").replace(/\s+/g, " ").trim();
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const fmtLat = (v: number) => `${Math.abs(v).toFixed(2)}° ${v < 0 ? "S" : "N"}`;
const fmtLon = (v: number) => { const w = ((v + 540) % 360) - 180; return `${Math.abs(w).toFixed(2)}° ${w < 0 ? "W" : "E"}`; };

/** dune-atlas_map_<dataset>_<lat>_<lon>_z<zoom>_<date>.png */
export function mapExportFilename(dataset: string, v: Pick<MapView, "lat" | "lon" | "zoom">, date: Date): string {
  const lon = ((v.lon + 540) % 360) - 180;
  return `dune-atlas_map_${dataset}_${v.lat.toFixed(2)}_${lon.toFixed(2)}_z${v.zoom.toFixed(1)}_${isoDate(date)}.png`;
}

export const PROJECTION_TEXT = { globe: "Globe (MapLibre globe)", mercator: "Web Mercator EPSG:3857" } as const;

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
  const scale = e.scale === "log" ? "log scale" : e.scale === "symlog" ? `symmetric log scale (linear within ±${tickLabel(e.linthresh)})` : "linear scale";
  const units = plain(l.units);
  const detail = [units, scale, `colormap ${e.colormap}${e.reverse ? " (reversed)" : ""}, limits ${tickLabel(e.clim[0])} to ${tickLabel(e.clim[1])}`,
    l.thresholdAware ? `at u*,th = ${ut.toFixed(2)} m/s` : "threshold-independent"].filter(Boolean).join(" · ");
  return { kind: "colorbar", title: plain(l.title), detail, colors: e.colors, ticks };
}

/** Strip items for the active layers and the view. */
export function mapStripItems(c: MapStripContext): StripItem[] {
  const { reg, state, view } = c;
  const ut = reg.threshold.values[state.utIndex];
  const ds = datasetInfo(state.dataset);
  const visible = [...new Set(state.order)].map((id) => reg.layers.find((l) => l.id === id)).filter((l): l is LayerDef => !!l && !!state.layers[l.id]?.visible);
  const items: StripItem[] = [{ kind: "heading", text: "Dune Atlas · map.geomorphlab.org" }];
  const anyThr = visible.some((l) => l.thresholdAware);
  items.push({ kind: "text", text: `${PROJECTION_TEXT[view.proj]} · centre ${fmtLat(view.lat)}, ${fmtLon(view.lon)} · zoom ${view.zoom.toFixed(1)} · wind dataset ${ds.name} ${ds.resolution}, ${ds.period}${anyThr ? ` · threshold friction velocity u*,th = ${ut.toFixed(2)} m/s` : ""}` });
  const sw: Extract<StripItem, { kind: "swatches" }>["items"] = [];
  for (const l of visible) {
    const cfg = state.layers[l.id]?.cfg;
    if (l.type === "zarr-field") {
      const e = effectiveDisplay(l, cfg);
      if (e.mode === "colormap") items.push(colorbarFor(l, cfg, ut));
      else sw.push({ color: e.vecColor, shape: e.mode === "arrows" && !isAxis(l) ? "arrow" : "line", label: `${plain(l.title)}: ${e.mode}, ${isAxis(l) ? "orientation axis" : "direction of transport (toward)"}${l.thresholdAware ? ` at u*,th = ${ut.toFixed(2)} m/s` : ""}` });
    } else {
      const v = vectorColors(l, cfg);
      sw.push({ color: v.fill, shape: "box", label: v.invert ? `${plain(l.title)}: land without mapped dunes` : plain(l.title) });
    }
  }
  if (sw.length) items.push({ kind: "swatches", items: sw });
  const sb = scaleBar(view);
  items.push({ kind: "mapkeys", bearing: view.bearing, northNote: view.proj === "globe" ? "north up at view centre" : undefined,
    scale: sb, scaleNote: sb ? (view.proj === "globe" ? "at view centre" : `at ${fmtLat(view.lat)}`) : "Scale bar omitted: the scale varies strongly across this view" });
  // sources: the paper, the wind dataset with its Copernicus notice, other external sources shown
  const src: string[] = [`Dune map and wind-regime method: Gunn, A. (2026) The distribution of Earth's wind-blown sand dunes. Nature Communications, doi:${PAPER_DOI}.`];
  src.push(state.dataset === "era5"
    ? `Wind: ERA5 hourly 10 m wind 1950–2024 (Hersbach et al. 2020, doi:${ERA5_PAPER_DOI}; data doi:${ERA5_DOI}); statistics computed for the Dune Atlas with the method of Gunn (2026). ${C3S_NOTICE_ERA5}`
    : `Wind: ERA5-Land hourly 10 m wind 1950–2024 (Muñoz-Sabater et al. 2021, doi:${ERA5LAND_PAPER_DOI}; data doi:${ERA5LAND_DOI}); statistics from Gunn (2026). ${C3S_NOTICE}`);
  if (visible.some((l) => l.id === "aridity")) src.push("Aridity: Global Aridity Index v3.1 (Zomer, Xu & Trabucco 2022, doi:10.1038/s41597-022-01493-1; data doi:10.6084/m9.figshare.7504448.v7), CC BY 4.0.");
  if (visible.some((l) => l.id === "vegetation")) src.push("Vegetation cover: CSIRO MODIS Fractional Cover v3.1 (Guerschman et al. 2015, doi:10.1016/j.rse.2015.01.021; data doi:10.4225/08/5848a3f19a7b3), CC BY 4.0, © 2008–2019 CSIRO.");
  const bm = reg.basemaps.find((b) => b.id === state.basemap);
  if (c.includeBasemap && bm) src.push(`Basemap: ${bm.title}${bm.attribution ? `, ${plain(bm.attribution.replace(/<[^>]+>/g, ""))}` : ""}.`);
  for (const s of src) items.push({ kind: "text", text: s, small: true });
  items.push({ kind: "text", text: `View: ${c.shareLink}`, small: true, muted: true });
  items.push({ kind: "text", text: `Exported ${isoDate(c.date)} from the Dune Atlas.`, small: true, muted: true });
  return items;
}

export function mapStripSvg(c: MapStripContext, scale = 1) { return stripSvg(mapStripItems(c), c.width, { scale }); }

// ---------------------------------------------------------------------------------------------
// Browser: capture and compose
// ---------------------------------------------------------------------------------------------

const waitIdle = (map: MlMap) => new Promise<void>((res) => { if (map.loaded() && !map.isMoving()) { map.once("idle", () => res()); map.triggerRepaint(); } else map.once("idle", () => res()); });

/** Capture the map canvas at `scale` (x CSS px). Basemap layers (and the selected-cell outline)
 *  are hidden while capturing when not wanted; everything is restored afterwards. */
export async function captureMap(map: MlMap, o: { scale: number; includeBasemap: boolean; isOwnLayer: (id: string) => boolean; settle: () => Promise<void> }): Promise<HTMLCanvasElement> {
  const hidden: string[] = [];
  for (const l of map.getStyle().layers) {
    const own = o.isOwnLayer(l.id);
    if (l.id.startsWith("selected-cell") || (!own && !o.includeBasemap)) {
      if (map.getLayoutProperty(l.id, "visibility") !== "none") { map.setLayoutProperty(l.id, "visibility", "none"); hidden.push(l.id); }
    }
  }
  const ratio = map.getPixelRatio();
  try {
    if (Math.abs(ratio - o.scale) > 1e-6) map.setPixelRatio(o.scale);
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

/** map image on top, strip below; transparent wherever nothing is drawn */
export async function composeWithStrip(top: HTMLCanvasElement, strip: { svg: string; height: number }, scale: number): Promise<Blob> {
  const img = await svgToImage(strip.svg);
  const c = document.createElement("canvas");
  c.width = top.width;
  c.height = top.height + Math.round(strip.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(top, 0, 0);
  ctx.drawImage(img, 0, top.height, c.width, Math.round(strip.height * scale));
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
