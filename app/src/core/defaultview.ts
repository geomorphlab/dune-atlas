// The state of the atlas when it is opened without view state in the URL (no #v= share link, no
// ?query permalink): the author's chosen opening view, equal to the share link
//   https://map.geomorphlab.org/#v=AQXirhW4wRLgAgIBDgMJVSACAWQAB1UA
// (tests check that encoding DEFAULT_VIEW gives exactly this link). The bare address stays clean
// (map.geomorphlab.org) until the user changes something.
//
// Precedence for the initial state: #v= share link > ?query permalink > default view; the wind
// dataset additionally honours a returning user's explicit choice (localStorage) when the URL has
// no view state. Pure (tested).
import type { ShareState } from "./share/shortlink";
import { shareToUrlState } from "./share/shortlink";
import { parseUrlState, type UrlState } from "./urlstate";
import type { Registry } from "./registry/types";
import { normaliseOrder, type AppState, type LayerState } from "./store";
import { migrateLegacySpacing } from "./layerconfig";
import { defaultBasemap } from "./map/basemaps";
import { PROFILE } from "@body/profile";

export const DEFAULT_SHARE_CODE = "AQXirhW4wRLgAgIBDgMJVSACAWQAB1UA";

/** Opening view of this body (the body profile's; Earth: Africa and Arabia, globe, ERA5 0.25°,
 *  u*,th = 0.15 m/s, RDD streamlines over the dune fields over DP; Mars: the north polar erg). */
export const DEFAULT_VIEW: ShareState = PROFILE.defaultView;

const VIEW_KEYS = ["lon", "lat", "zoom", "basemap", "layers", "ut", "cell", "proj", "order", "dataset"] as const;
/** does a parsed ?query carry view state (embed=1 / tour=1 alone do not) */
export const hasViewState = (u: UrlState) => VIEW_KEYS.some((k) => u[k] !== undefined);

export interface InitialState {
  /** the view to open (all view fields set) plus embed / tour */
  url: UrlState;
  dataset: string | undefined;
  /** where the view came from */
  source: "share" | "query" | "default";
  /** layer list open (share links carry it; otherwise the responsive default) */
  panel?: boolean;
  bearing: number;
  pitch: number;
}

/**
 * @param shared  decoded #v= link, or null
 * @param query   parsed ?query
 * @param legacyDataset dataset of query permalinks without `dataset` (written before it was always
 *                included: the registry defaultDataset, ERA5-Land)
 * @param stored  the user's last explicit dataset choice (localStorage), if any
 */
export function resolveInitialState(shared: ShareState | null, query: UrlState, legacyDataset: string | undefined, stored: string | undefined, def: ShareState = DEFAULT_VIEW): InitialState {
  const extras: UrlState = { ...(query.embed ? { embed: true } : {}), ...(query.tour ? { tour: true } : {}), ...(query.plot ? { plot: query.plot } : {}) };
  const defUrl = shareToUrlState(def);
  if (shared) return { url: { ...shareToUrlState(shared), ...extras }, dataset: shared.dataset, source: "share", panel: shared.panel, bearing: shared.bearing ?? 0, pitch: shared.pitch ?? 0 };
  if (hasViewState(query)) {
    // fields the permalink lacks come from the default view; the camera only as a whole
    const cam = query.lon !== undefined && query.lat !== undefined ? { lon: query.lon, lat: query.lat } : { lon: defUrl.lon, lat: defUrl.lat };
    const merged: UrlState = { ...defUrl, ...stripUndef(query), ...cam };
    if (query.layers && !query.order) delete merged.order; // the permalink's own order (registry order) applies
    return { url: merged, dataset: query.dataset ?? legacyDataset, source: "query", bearing: 0, pitch: 0 };
  }
  return { url: { ...defUrl, ...extras }, dataset: stored ?? def.dataset, source: "default", bearing: def.bearing ?? 0, pitch: def.pitch ?? 0 };
}

/** localStorage name (per body, body.ts storageKey) of the last view: the address query of the current view. */
export const LAST_VIEW = "lastView";
/** Planet button: the other atlas is opened with `?resume=1`; a link with that flag and no view
 *  state of its own opens the last view stored by this atlas (camera, basemap, projection, layers with their
 *  opacity and display, threshold, cell, dataset, Dunes only), keeping the link's embed / tour flags. */
export function resumeQuery(query: UrlState, stored: string | null | undefined): UrlState {
  if (!query.resume || hasViewState(query) || !stored) return query;
  const last = parseUrlState(stored);
  if (!hasViewState(last)) return query;
  delete last.embed; delete last.tour;
  return { ...last, ...(query.embed ? { embed: true } : {}), ...(query.tour ? { tour: true } : {}), resume: true };
}

const stripUndef = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** The app state for a resolved view: layers listed in the view are visible with its opacity and
 *  display config, all others hidden at their registry opacity; drawing order = the view's, then
 *  the registry's. */
export function initialAppState(reg: Registry, url: UrlState, dataset: string): AppState {
  const urlLayers = url.layers ? new Map(url.layers.map((l) => [l.id, l])) : null;
  const layers: Record<string, LayerState> = {};
  for (const l of reg.layers) {
    const u = urlLayers?.get(l.id);
    // old links carry px spacing (ds=); convert to the km step at the initial view
    const cfg = migrateLegacySpacing(u?.cfg, url.lat ?? DEFAULT_VIEW.lat, url.zoom ?? DEFAULT_VIEW.zoom);
    layers[l.id] = { visible: urlLayers ? !!u : !!l.visible, opacity: u?.opacity ?? l.opacity ?? 1, ...(cfg ? { cfg } : {}) };
  }
  const basemapIds = new Set(reg.basemaps.map((b) => b.id));
  return {
    basemap: url.basemap && basemapIds.has(url.basemap) ? url.basemap : defaultBasemap(reg.basemaps).id,
    projection: url.proj ?? "globe",
    utIndex: url.ut ?? reg.threshold.defaultIndex,
    layers,
    order: normaliseOrder(url.order, reg.layers.map((l) => l.id)),
    dataset,
    cell: url.cell ?? null,
    embed: !!url.embed,
    dunesOnly: !!url.dunesOnly,
    ...(url.names ? { names: true } : {}),
    ...(url.plot ? { plotY: url.plot } : {}),
  };
}

/** The share state of the app (what the Share button encodes). */
export function appShareState(s: AppState, cam: { lon: number; lat: number; zoom: number; bearing?: number; pitch?: number }, panel: boolean): ShareState {
  return {
    lon: cam.lon, lat: cam.lat, zoom: cam.zoom, bearing: cam.bearing ?? 0, pitch: cam.pitch ?? 0, proj: s.projection,
    dataset: s.dataset, basemap: s.basemap, ut: s.utIndex, cell: s.cell,
    layers: s.order.filter((id) => s.layers[id]?.visible).map((id) => ({ id, opacity: Number(s.layers[id].opacity.toFixed(2)), ...(s.layers[id].cfg ? { cfg: s.layers[id].cfg } : {}) })),
    panel,
    ...(s.dunesOnly ? { dunesOnly: true } : {}),
    ...(s.names ? { names: true } : {}),
    // the plotted quantity only when it is not the default (DP), so default links stay as they were
    ...(s.plotY && s.plotY !== "dpm" ? { plotY: s.plotY } : {}),
  };
}
