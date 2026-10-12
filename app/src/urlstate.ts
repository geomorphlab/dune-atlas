// Permalink state <-> URL query string. Pure (tested).
//   ?lon=15.2&lat=-24.5&zoom=6.2&basemap=openfreemap-dark&layers=at:0.8~cm=hsv~mode=a,dunes~inv=1
//    &ut=14&cell=1145,1952&proj=globe|mercator&embed=1&order=dunes,at,...&dataset=era5-land
// `layers` absent -> registry defaults; `layers=` (empty) -> no overlays. Per-layer tokens:
// id[:opacity][~key=value]* (keys in layerconfig.ts: cm rev lo hi log mode vc fc lc inv ol).
import { decodeConfig, encodeConfig, type LayerConfig } from "./layerconfig";

export interface UrlState {
  lon?: number;
  lat?: number;
  zoom?: number;
  basemap?: string;
  /** visible layers in order with optional opacity and config */
  layers?: { id: string; opacity?: number; cfg?: LayerConfig }[];
  ut?: number;
  cell?: [number, number];
  proj?: "globe" | "mercator";
  embed?: boolean;
  /** drawing order (top first), only when it differs from the registry */
  order?: string[];
  dataset?: string;
}

const num = (s: string | null) => (s === null || s.trim() === "" ? undefined : Number.isFinite(Number(s)) ? Number(s) : undefined);

export function parseUrlState(search: string): UrlState {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const st: UrlState = {};
  const lon = num(q.get("lon")), lat = num(q.get("lat")), zoom = num(q.get("zoom"));
  if (lon !== undefined && lat !== undefined && Math.abs(lat) <= 90) { st.lon = lon; st.lat = lat; }
  if (zoom !== undefined) st.zoom = Math.max(0, Math.min(24, zoom));
  const bm = q.get("basemap");
  if (bm && /^[a-z0-9-]+$/.test(bm)) st.basemap = bm;
  if (q.has("layers")) {
    st.layers = (q.get("layers") ?? "").split(",").filter(Boolean).flatMap((tok) => {
      const [head, ...rest] = tok.split("~");
      const [id, op] = head.split(":");
      if (!/^[a-z0-9_-]+$/.test(id)) return [];
      const o = num(op ?? null);
      const cfg = decodeConfig(rest);
      return [{ id, ...(o === undefined ? {} : { opacity: Math.max(0, Math.min(1, o)) }), ...(cfg ? { cfg } : {}) }];
    });
  }
  const ut = num(q.get("ut"));
  if (ut !== undefined && Number.isInteger(ut) && ut >= 0 && ut < 64) st.ut = ut;
  // grid-agnostic: any non-negative indices; checked against the cell store grid when opened
  const cell = (q.get("cell") ?? "").split(",").map(Number);
  if (cell.length === 2 && cell.every((v) => Number.isInteger(v) && v >= 0 && v < 1e6)) st.cell = [cell[0], cell[1]];
  if (q.has("order")) {
    const o = (q.get("order") ?? "").split(",").filter((id) => /^[a-z0-9_-]+$/.test(id));
    if (o.length) st.order = o;
  }
  const ds = q.get("dataset");
  if (ds && /^[a-z0-9-]+$/.test(ds)) st.dataset = ds;
  const proj = q.get("proj");
  if (proj === "globe" || proj === "mercator") st.proj = proj;
  if (q.get("embed") === "1") st.embed = true;
  return st;
}

export function serializeUrlState(st: UrlState): string {
  const q: string[] = [];
  const put = (k: string, v: string) => q.push(`${k}=${encodeURIComponent(v).replace(/%2C/g, ",").replace(/%3A/g, ":").replace(/%3D/g, "=")}`);
  if (st.lon !== undefined && st.lat !== undefined) { put("lon", st.lon.toFixed(4)); put("lat", st.lat.toFixed(4)); }
  if (st.zoom !== undefined) put("zoom", st.zoom.toFixed(2));
  if (st.basemap) put("basemap", st.basemap);
  if (st.layers) put("layers", st.layers.map((l) => (l.opacity === undefined || l.opacity === 1 ? l.id : `${l.id}:${Number(l.opacity.toFixed(2))}`) + encodeConfig(l.cfg)).join(","));
  if (st.ut !== undefined) put("ut", String(st.ut));
  if (st.cell) put("cell", `${st.cell[0]},${st.cell[1]}`);
  if (st.proj) put("proj", st.proj);
  if (st.embed) put("embed", "1");
  if (st.order?.length) put("order", st.order.join(","));
  if (st.dataset) put("dataset", st.dataset);
  return q.length ? `?${q.join("&")}` : "";
}
