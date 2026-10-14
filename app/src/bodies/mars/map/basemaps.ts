// Mars basemaps: resolve relative `pmtiles://<key>/{z}/{x}/{y}` tiles of the registry against the
// data base (the MOLA–HRSC terrarium archive lives next to the other Mars stores), and register the
// esri-mars:// protocol for the Esri OnMars basemaps of the registry (see docs/guide/mars.md).
import type { BasemapDef } from "../../../registry/types";
import { PMTiles, type Protocol } from "pmtiles";
import { ensureEsriProtocol } from "./esri";

export function resolvePmtilesTiles(tiles: string[] | undefined, dataBase: string): string[] | undefined {
  return tiles?.map((t) => {
    const m = /^pmtiles:\/\/(.*)$/.exec(t);
    if (!m || /^[a-z][a-z0-9+.-]*:\/\//i.test(m[1])) return t; // absolute archive URL
    return `pmtiles://${dataBase.replace(/\/+$/, "")}/${m[1].replace(/^\/+/, "")}`;
  });
}

export const isEsriBasemap = (b: BasemapDef) => !!b.tiles?.some((t) => t.startsWith("esri-mars://"));

/** The esri-mars:// reprojection needs OffscreenCanvas + createImageBitmap (every current browser); without
 *  them the Esri basemaps are left out of the list rather than shown broken. */
export const canReproject = () => typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function";

export function prepareMarsBasemaps(basemaps: BasemapDef[], dataBase: string, opts: { reproject?: boolean; register?: () => void } = {}): BasemapDef[] {
  let out = basemaps.map((b) => (b.tiles ? { ...b, tiles: resolvePmtilesTiles(b.tiles, dataBase) } : { ...b }));
  if (out.some(isEsriBasemap)) {
    if (opts.reproject ?? canReproject()) (opts.register ?? ensureEsriProtocol)();
    else out = out.filter((b) => !isEsriBasemap(b) || b.default);
  }
  return out;
}

/** archive URL of a `pmtiles://<url>/{z}/{x}/{y}` tile template (null for other templates) */
export function pmtilesArchive(tile: string): string | null {
  const m = /^pmtiles:\/\/(.+?)\/\{z\}\/\{x\}\/\{y\}$/.exec(tile);
  return m ? m[1] : null;
}

/** Overzoom from a shallower archive: read each pmtiles basemap's header and lower its source maxzoom to the
 *  archive's (e.g. the local z0-5 dev subset of the z0-8 production archive), so MapLibre overzooms the
 *  deepest tiles instead of requesting tiles that do not exist. The registry value (8) is the production one
 *  and stays the upper bound. `onChange` is called for every basemap whose maxzoom was lowered. */
export function clampPmtilesBasemaps(basemaps: BasemapDef[], protocol: Pick<Protocol, "add" | "get">, onChange: (b: BasemapDef) => void, open: (url: string) => PMTiles = (u) => new PMTiles(u)): Promise<void[]> {
  return Promise.all(basemaps.map(async (b) => {
    const url = b.tiles?.length ? pmtilesArchive(b.tiles[0]) : null;
    if (!url) return;
    let p = protocol.get(url);
    if (!p) { p = open(url); protocol.add(p); }
    try {
      const h = await p.getHeader();
      if (Number.isFinite(h.maxZoom) && h.maxZoom < (b.maxzoom ?? 12)) { b.maxzoom = h.maxZoom; onChange(b); }
    } catch (e) { console.warn(`[dune-atlas] basemap ${b.id}: archive header not readable`, e); }
  }));
}
