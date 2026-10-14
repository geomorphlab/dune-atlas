// Short share links: the full view state as a compact, versioned binary in the URL hash
// (#v=<base64url>). No server. Format v1 (all integers as LEB128 varints, signed ones zigzag):
//   version (=1) | flags (1 globe, 2 cell, 4 panel, 8 view, 16 dunes only) | lon*1e4 | lat*1e4 | zoom*100 | [bearing*10 | pitch*10] | dataset | basemap
//   | ut index | [cell iy | ix] | n layers | per layer: id | opacity*100 | config mask | config fields
// Ids (layers, basemaps, datasets, colormaps) are indices into APPEND-ONLY tables, so links stay
// valid when the registry grows; an id missing from a table is written inline (0, length, UTF-8).
// Old ?query permalinks are still parsed by urlstate.ts.
import { SPACING_KM_STEPS, type LayerConfig, type RenderMode } from "../layerconfig";

/** append-only id tables of format v1 (never reorder or remove entries) */
export const SHARE_IDS = {
  layers: ["dunes", "at", "ae", "qacb", "sige_sigh", "uft", "dpm", "rdpm", "rdpa", "qha_rdp_dp", "ab", "ao", "qncb", "qnlb", "qalb", "qnle", "qale", "qace",
    "qhab_nl_nc", "qhab_ac_nc", "qhne_ac_nl", "ufm", "qhbf", "qhef", "aridity", "qsdiv", "vegetation"],
  basemaps: ["openfreemap-dark", "esri-imagery", "hillshade", "opentopomap", "openfreemap-light"],
  datasets: ["era5-land", "era5"],
  colormaps: ["viridis", "magma", "inferno", "plasma", "cividis", "twilight", "twilight_shifted", "rdbu", "puor", "brbg", "piyg", "ylorbr", "ylgn", "greys", "turbo", "hsv"],
} as const;

export interface ShareLayer { id: string; opacity: number; cfg?: LayerConfig }
export interface ShareState {
  lon: number;
  lat: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  proj: "globe" | "mercator";
  dataset: string;
  basemap: string;
  /** threshold index */
  ut: number;
  /** visible layers in drawing order (top first) with opacity and display config */
  layers: ShareLayer[];
  cell?: [number, number] | null;
  /** layer panel expanded (decoded links always carry it) */
  panel?: boolean;
  /** 'Dunes only' (flag bit 16; links without it: off) */
  dunesOnly?: boolean;
}

export const SHARE_VERSION = 1;
const F_GLOBE = 1, F_CELL = 2, F_PANEL = 4, F_VIEW = 8, F_DUNES = 16;
// per-layer config mask
const C_CMAP = 1, C_REV = 2, C_CLIM = 4, C_LOG = 8, C_LOGV = 16, C_MODE = 32, C_VC = 64, C_KM = 128, C_FILL = 256, C_INV = 512;
const MODES: RenderMode[] = ["colormap", "arrows", "streamlines"];

class W {
  b: number[] = [];
  u(v: number) { v = Math.max(0, Math.round(v)); do { let x = v % 128; v = Math.floor(v / 128); if (v) x |= 128; this.b.push(x); } while (v); }
  s(v: number) { v = Math.round(v); this.u(v < 0 ? -2 * v - 1 : 2 * v); }
  id(v: string, table: readonly string[]) {
    const i = table.indexOf(v);
    if (i >= 0) { this.u(i + 1); return; }
    const t = new TextEncoder().encode(v); this.u(0); this.u(t.length); this.b.push(...t);
  }
  rgb(hex: string) { const n = parseInt(hex.slice(1), 16); this.b.push((n >> 16) & 255, (n >> 8) & 255, n & 255); }
  /** decimal with up to 6 significant digits: mantissa * 10^exponent */
  num(v: number) {
    const [m, e] = decimal(v); this.s(m); this.s(e);
  }
}
class R {
  i = 0;
  constructor(private b: Uint8Array) {}
  byte() { if (this.i >= this.b.length) throw new Error("truncated"); return this.b[this.i++]; }
  u() { let v = 0, m = 1, x: number; do { x = this.byte(); v += (x & 127) * m; m *= 128; } while (x & 128 && m < 2 ** 53); return v; }
  s() { const v = this.u(); return v % 2 ? -(v + 1) / 2 : v / 2; }
  id(table: readonly string[]) {
    const k = this.u();
    if (k > 0) { const v = table[k - 1]; if (v === undefined) throw new Error("unknown id"); return v; }
    const n = this.u(); const t = this.b.subarray(this.i, this.i + n); this.i += n; return new TextDecoder().decode(t);
  }
  rgb() { const r = this.byte(), g = this.byte(), b = this.byte(); return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`; }
  num() { const m = this.s(), e = this.s(); return Number(`${m}e${e}`); }
}

/** v ≈ m * 10^e with |m| < 10^6 (6 significant digits, as the ?query links) */
function decimal(v: number): [number, number] {
  if (v === 0 || !Number.isFinite(v)) return [0, 0];
  const [mant, exp] = Number(v.toPrecision(6)).toExponential().split("e");
  const digits = mant.replace(/[.-]/g, "").replace(/0+$/, "") || "0";
  const m = Number(digits) * Math.sign(v);
  return [m, Number(exp) - (digits.length - 1)];
}

const b64url = (b: number[] | Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

const wrapLon = (lon: number) => lon - 360 * Math.floor((lon + 180) / 360);

/** Encode a state as the hash value (without '#v='). */
export function encodeShare(st: ShareState): string {
  const w = new W();
  w.u(SHARE_VERSION);
  const hasView = !!(st.bearing || st.pitch);
  w.u((st.proj === "globe" ? F_GLOBE : 0) | (st.cell ? F_CELL : 0) | (st.panel ? F_PANEL : 0) | (hasView ? F_VIEW : 0) | (st.dunesOnly ? F_DUNES : 0));
  w.s(wrapLon(st.lon) * 1e4); w.s(Math.max(-90, Math.min(90, st.lat)) * 1e4); w.u(Math.max(0, st.zoom) * 100);
  if (hasView) { w.s((st.bearing ?? 0) * 10); w.u((st.pitch ?? 0) * 10); }
  w.id(st.dataset, SHARE_IDS.datasets); w.id(st.basemap, SHARE_IDS.basemaps); w.u(st.ut);
  if (st.cell) { w.u(st.cell[0]); w.u(st.cell[1]); }
  w.u(st.layers.length);
  for (const l of st.layers) {
    w.id(l.id, SHARE_IDS.layers);
    w.u(Math.max(0, Math.min(1, l.opacity)) * 100);
    const c = l.cfg ?? {};
    const mode = c.mode && c.mode !== "colormap" ? MODES.indexOf(c.mode) : -1;
    const km = c.spacingKm !== undefined ? SPACING_KM_STEPS.indexOf(c.spacingKm) : -1;
    const mask = (c.colormap ? C_CMAP : 0) | (c.reverse ? C_REV : 0) | (c.clim ? C_CLIM : 0) | (c.log !== undefined ? C_LOG : 0) | (c.log ? C_LOGV : 0)
      | (mode > 0 ? C_MODE : 0) | (c.vecColor ? C_VC : 0) | (km >= 0 ? C_KM : 0) | (c.fill ? C_FILL : 0) | (c.invert ? C_INV : 0);
    w.u(mask);
    if (mask & C_CMAP) w.id(c.colormap!, SHARE_IDS.colormaps);
    if (mask & C_CLIM) { w.num(c.clim![0]); w.num(c.clim![1]); }
    if (mask & C_MODE) w.u(mode);
    if (mask & C_VC) w.rgb(c.vecColor!);
    if (mask & C_KM) w.u(km);
    if (mask & C_FILL) w.rgb(c.fill!);
  }
  return b64url(w.b);
}

/** Decode a hash value (without '#v='); null if it is not a valid link of a known version. */
export function decodeShare(s: string): ShareState | null {
  try {
    const r = new R(unb64url(s));
    if (r.u() !== SHARE_VERSION) return null;
    const f = r.u();
    const st: ShareState = { lon: r.s() / 1e4, lat: r.s() / 1e4, zoom: r.u() / 100, proj: f & F_GLOBE ? "globe" : "mercator", dataset: "", basemap: "", ut: 0, layers: [] };
    if (f & F_VIEW) { st.bearing = r.s() / 10; st.pitch = r.u() / 10; }
    st.dataset = r.id(SHARE_IDS.datasets); st.basemap = r.id(SHARE_IDS.basemaps); st.ut = r.u();
    st.cell = f & F_CELL ? [r.u(), r.u()] : null;
    st.panel = !!(f & F_PANEL);
    if (f & F_DUNES) st.dunesOnly = true;
    const n = r.u();
    if (n > 200) return null;
    for (let k = 0; k < n; k++) {
      const id = r.id(SHARE_IDS.layers), opacity = r.u() / 100, mask = r.u();
      const cfg: LayerConfig = {};
      if (mask & C_CMAP) cfg.colormap = r.id(SHARE_IDS.colormaps);
      if (mask & C_REV) cfg.reverse = true;
      if (mask & C_CLIM) { const a = r.num(), b = r.num(); if (b > a) cfg.clim = [a, b]; }
      if (mask & C_LOG) cfg.log = !!(mask & C_LOGV);
      if (mask & C_MODE) { const m = MODES[r.u()]; if (m) cfg.mode = m; }
      if (mask & C_VC) cfg.vecColor = r.rgb();
      if (mask & C_KM) { const km = SPACING_KM_STEPS[r.u()]; if (km !== undefined) cfg.spacingKm = km; }
      if (mask & C_FILL) cfg.fill = r.rgb();
      if (mask & C_INV) cfg.invert = true;
      st.layers.push({ id, opacity, ...(Object.keys(cfg).length ? { cfg } : {}) });
    }
    return st;
  } catch {
    return null;
  }
}

/** The '#v=…' value of a location hash, or null. */
export function shareFromHash(hash: string): ShareState | null {
  const m = /^#?v=([A-Za-z0-9_-]+)$/.exec(hash.trim());
  return m ? decodeShare(m[1]) : null;
}

export const shareUrl = (base: string, st: ShareState) => `${base}#v=${encodeShare(st)}`;

/** The URL state (as parsed from ?query links) equivalent to a share state. */
export function shareToUrlState(st: ShareState): import("../urlstate").UrlState {
  return {
    lon: st.lon, lat: st.lat, zoom: st.zoom, basemap: st.basemap, proj: st.proj, dataset: st.dataset, ut: st.ut,
    layers: st.layers.map((l) => ({ id: l.id, opacity: l.opacity, ...(l.cfg ? { cfg: l.cfg } : {}) })),
    order: st.layers.map((l) => l.id),
    ...(st.cell ? { cell: st.cell } : {}),
    ...(st.dunesOnly ? { dunesOnly: true } : {}),
  };
}
