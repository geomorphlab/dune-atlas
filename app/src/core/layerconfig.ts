// Per-layer user configuration (colormap, reverse, clim, log, render mode, spacing, fill, invert) on
// top of the registry defaults. Pure: defaults, effective display, URL token encoding (tested).
import type { LayerDef } from "./registry/types";
import { COLORMAPS } from "./util/colormaps";
import { PROFILE } from "@body/profile";

export type RenderMode = "colormap" | "arrows" | "streamlines";

export interface LayerConfig {
  colormap?: string;
  reverse?: boolean;
  clim?: [number, number];
  log?: boolean;
  mode?: RenderMode;
  /** arrow / streamline colour (#rrggbb) */
  vecColor?: string;
  /** arrow spacing / streamline separation on the ground (km, one of SPACING_KM_STEPS) */
  spacingKm?: number;
  /** legacy URL `ds=` spacing in px (pre km); converted to spacingKm once the map view is known */
  legacyDsepPx?: number;
  /** vector layers: fill colour (#rrggbb) */
  fill?: string;
  /** vector layers with invertSource: colour the complement instead */
  invert?: boolean;
}

export const COLORMAP_GROUPS: { label: string; names: string[] }[] = [
  { label: "Sequential", names: ["viridis", "magma", "inferno", "plasma", "cividis", "turbo", "ylorbr", "ylgn", "greys"] },
  { label: "Diverging", names: COLORMAP_GROUPS_DIVERGING() },
  { label: "Cyclic", names: ["twilight", "twilight_shifted", "hsv"] },
];

export const isDirectional = (l: LayerDef) => l.type === "zarr-field" && (l.display?.transform === "rad-to-bearing" || l.display?.transform === "rad-to-axis");
export const isAxis = (l: LayerDef) => l.display?.transform === "rad-to-axis";
/** log scaling makes sense for non-angle fields only */
export const canLog = (l: LayerDef) => l.type === "zarr-field" && !isDirectional(l);

/** Colour scale: "log" when log is requested and min > 0; "symlog" (symmetric log) when log is
 *  requested and min < 0 < max; otherwise linear. */
export type ColourScale = "linear" | "log" | "symlog";
export const DIVERGING_COLORMAPS = new Set(COLORMAP_GROUPS_DIVERGING());
function COLORMAP_GROUPS_DIVERGING(): string[] { return ["rdbu", "puor", "brbg", "piyg"]; }

/** scale chosen for a requested-log layer with colour limits `clim` */
export function scaleFor(logRequested: boolean, clim: [number, number]): ColourScale {
  if (!logRequested) return "linear";
  if (clim[0] > 0) return "log";
  if (clim[0] < 0 && clim[1] > 0) return "symlog";
  return "linear";
}
/** symlog linear threshold c = 10^(floor(log10(max(|min|, |max|))) - 2), e.g. +-0.3 -> 0.001 */
export function symlogThreshold(clim: [number, number]): number {
  const m = Math.max(Math.abs(clim[0]), Math.abs(clim[1]));
  return 10 ** (Math.floor(Math.log10(m) + 1e-9) - 2);
}
/** f(v) = sign(v) log10(1 + |v| / c) */
export const symlog = (v: number, c: number) => Math.sign(v) * Math.log10(1 + Math.abs(v) / c);
/** symlog keeps 0 at the colormap centre when the limits are symmetric, or when the colormap is
 *  diverging; otherwise f is interpolated linearly between the limits. */
export function symlogCentred(clim: [number, number], colormap: string): boolean {
  if (!(clim[0] < 0 && clim[1] > 0)) return false;
  const symmetric = Math.abs(clim[0] + clim[1]) <= 1e-9 * Math.max(-clim[0], clim[1]);
  return symmetric || DIVERGING_COLORMAPS.has(colormap);
}
/** Position (0..1, clamped) of value v on the colour scale; identical to the shader mapping. */
export function scaleNorm(e: Pick<EffectiveDisplay, "clim" | "scale" | "linthresh" | "centred">, v: number): number {
  const [a, b] = e.clim;
  let t: number;
  if (e.scale === "log") t = (Math.log(Math.max(v, a)) - Math.log(a)) / (Math.log(b) - Math.log(a));
  else if (e.scale === "symlog") {
    const f = (x: number) => symlog(x, e.linthresh);
    t = e.centred ? (v >= 0 ? 0.5 + (0.5 * f(v)) / f(b) : 0.5 - (0.5 * f(v)) / f(a)) : (f(v) - f(a)) / (f(b) - f(a));
  } else t = (v - a) / (b - a);
  return Math.max(0, Math.min(1, t));
}

export const DEFAULT_VEC_COLOR = "#f2f2f2";
/** default fill of vector layers without a registry fill colour (neutral grey) */
export const DEFAULT_VECTOR_FILL = "#a0a0a0";

/** Direction-validity rule (map and side panel): a direction field is shown only where its
 *  paired magnitude is > 0 and finite. rdpa is exactly 0 (= east) where DP = 0, and ae/ao hold
 *  arbitrary values where the elongation-mode crest flux is 0. */
export const DIRECTION_MASK_VAR: Record<string, string> = { rdpa: "rdpm", at: "qacb", ab: "qacb", ae: "qace", ao: "qace" };
/** Mask variable of a directional layer: display.maskVar, else display.magnitudeVar, else the
 *  default pairing; undefined for non-directional layers. */
export function maskVarOf(l: LayerDef): string | undefined {
  if (!isDirectional(l)) return undefined;
  return l.display?.maskVar ?? l.display?.magnitudeVar ?? (l.variable ? DIRECTION_MASK_VAR[l.variable] : undefined);
}

/** Effective display settings for a zarr-field layer. */
export interface EffectiveDisplay {
  colormap: string;
  reverse: boolean;
  colors: string[];
  clim: [number, number];
  /** log requested and applicable (log or symlog scale) */
  log: boolean;
  scale: ColourScale;
  /** symlog linear threshold c (0 unless scale is symlog) */
  linthresh: number;
  /** symlog: 0 at the colormap centre */
  centred: boolean;
  mode: RenderMode;
  vecColor: string;
  /** arrow spacing (arrows) or streamline separation (streamlines) on the ground, km */
  spacingKm: number;
}

/** Spacing slider steps (km) and default; converted to screen px at the view centre. */
export const SPACING_KM_STEPS = [10, 20, 50, 100, 200, 500, 1000];
export const DEFAULT_SPACING_KM = 100;
/** screen spacing is clamped to this range (px) for legibility / speed */
export const DSEP_PX_CLAMP: [number, number] = [8, 120];

/** Web-Mercator ground resolution (m per CSS px) at latitude `lat` (deg), zoom `zoom`. MapLibre
 *  zoom levels are defined on 512-px tiles: 2 pi R cos(lat) / (512 * 2^z), with R the body's Web
 *  Mercator radius (Earth: 78271.52 cos(lat) / 2^z; the 156543.03 constant is for 256-px tiles). */
export function metersPerPixel(lat: number, zoom: number, tileSize = 512): number {
  return (PROFILE.mercatorCircumferenceM * Math.cos((lat * Math.PI) / 180)) / (tileSize * 2 ** zoom);
}

export interface ScreenSpacing { km: number; px: number; rawPx: number; clamped: boolean }
/** km -> screen px at a ground resolution of `mPerPx`, clamped to DSEP_PX_CLAMP. */
export function spacingToPx(km: number, mPerPx: number): ScreenSpacing {
  const rawPx = (km * 1000) / Math.max(mPerPx, 1e-9);
  const px = Math.min(DSEP_PX_CLAMP[1], Math.max(DSEP_PX_CLAMP[0], rawPx));
  return { km, px, rawPx, clamped: px !== rawPx };
}
/** nearest slider step (in log space) to a ground spacing in km */
export function nearestSpacingStep(km: number): number {
  let best = SPACING_KM_STEPS[0];
  for (const k of SPACING_KM_STEPS) if (Math.abs(Math.log(k / km)) < Math.abs(Math.log(best / km))) best = k;
  return best;
}
/** fields that are fractions in [0, 1]: default colour limits [0, 1] if the registry has none */
export const FRACTION_VARS = new Set(["uft", "qhbf", "qhef", "qha_rdp_dp", "sige_sigh"]);

export function effectiveDisplay(l: LayerDef, cfg: LayerConfig = {}): EffectiveDisplay {
  const d = l.display ?? {};
  const colormap = cfg.colormap && COLORMAPS[cfg.colormap] ? cfg.colormap : d.colormap ?? "viridis";
  const reverse = !!cfg.reverse;
  const base = COLORMAPS[colormap] ?? COLORMAPS.viridis;
  // registry clim is the default (never data-derived); fractions without one default to [0, 1]
  const regClim = d.clim ?? (l.variable && FRACTION_VARS.has(l.variable) ? [0, 1] : [0, 1]);
  const clim = (cfg.clim && cfg.clim[1] > cfg.clim[0] ? cfg.clim : regClim) as [number, number];
  const scale = scaleFor(canLog(l) && (cfg.log ?? !!d.log), clim);
  const log = scale !== "linear";
  const linthresh = scale === "symlog" ? symlogThreshold(clim) : 0;
  const centred = scale === "symlog" && symlogCentred(clim, colormap);
  const mode: RenderMode = isDirectional(l) ? cfg.mode ?? "colormap" : "colormap";
  const spacingKm = cfg.spacingKm && SPACING_KM_STEPS.includes(cfg.spacingKm) ? cfg.spacingKm : DEFAULT_SPACING_KM;
  return { colormap, reverse, colors: reverse ? [...base].reverse() : base, clim, log, scale, linthresh, centred, mode, vecColor: cfg.vecColor ?? DEFAULT_VEC_COLOR, spacingKm };
}

/** Fill colour (registry style default) and invert state of a vector layer. Vector layers are
 *  drawn as fills only (no outlines). */
export function vectorColors(l: LayerDef, cfg: LayerConfig = {}): { fill: string; invert: boolean } {
  const f = l.style?.fill?.["fill-color"];
  return {
    fill: cfg.fill ?? (typeof f === "string" ? f : DEFAULT_VECTOR_FILL),
    invert: !!cfg.invert && !!l.invertSource,
  };
}

/** Convert a legacy px spacing (URL `ds=`) to the nearest km step at the given view; other
 *  settings are kept, an explicit spacingKm wins. */
export function migrateLegacySpacing(cfg: LayerConfig | undefined, lat: number, zoom: number): LayerConfig | undefined {
  if (!cfg || cfg.legacyDsepPx === undefined) return cfg;
  const { legacyDsepPx, ...rest } = cfg;
  if (rest.spacingKm === undefined) rest.spacingKm = nearestSpacingStep((legacyDsepPx * metersPerPixel(lat, zoom)) / 1000);
  return rest;
}

// ---- URL tokens: id[:opacity][~key=value]* ----
const MODES: Record<string, RenderMode> = { c: "colormap", a: "arrows", s: "streamlines" };
const MODE_KEY: Record<RenderMode, string> = { colormap: "c", arrows: "a", streamlines: "s" };
const hex = (v: string) => (/^[0-9a-f]{6}$/i.test(v) ? `#${v.toLowerCase()}` : undefined);
const num = (v: string) => (v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

export function encodeConfig(cfg: LayerConfig | undefined): string {
  if (!cfg) return "";
  const p: string[] = [];
  if (cfg.colormap) p.push(`cm=${cfg.colormap}`);
  if (cfg.reverse) p.push("rev=1");
  if (cfg.clim) p.push(`lo=${Number(cfg.clim[0].toPrecision(6))}`, `hi=${Number(cfg.clim[1].toPrecision(6))}`);
  if (cfg.log !== undefined) p.push(`log=${cfg.log ? 1 : 0}`);
  if (cfg.mode && cfg.mode !== "colormap") p.push(`mode=${MODE_KEY[cfg.mode]}`);
  if (cfg.vecColor) p.push(`vc=${cfg.vecColor.slice(1)}`);
  if (cfg.spacingKm) p.push(`km=${cfg.spacingKm}`);
  if (cfg.fill) p.push(`fc=${cfg.fill.slice(1)}`);
  if (cfg.invert) p.push("inv=1");
  return p.map((x) => `~${x}`).join("");
}

export function decodeConfig(parts: string[]): LayerConfig | undefined {
  const c: LayerConfig = {};
  let lo: number | undefined, hi: number | undefined;
  for (const kv of parts) {
    const [k, v = ""] = kv.split("=");
    switch (k) {
      case "cm": if (COLORMAPS[v]) c.colormap = v; break;
      case "rev": c.reverse = v === "1"; break;
      case "lo": lo = num(v); break;
      case "hi": hi = num(v); break;
      case "log": c.log = v === "1"; break;
      case "mode": if (MODES[v]) c.mode = MODES[v]; break;
      case "vc": c.vecColor = hex(v); break;
      case "km": { const n = num(v); if (n !== undefined && SPACING_KM_STEPS.includes(n)) c.spacingKm = n; break; }
      // legacy px spacing (before km): migrated to km at the initial view (main.ts)
      case "ds": { const n = num(v); if (n !== undefined && n > 0 && n <= 1000) c.legacyDsepPx = n; break; }
      case "fc": c.fill = hex(v); break;
      case "inv": c.invert = v === "1"; break;
      // "lc" (outline colour) and "ol" (outlines) are no longer used and ignored
    }
  }
  if (lo !== undefined && hi !== undefined && hi > lo) c.clim = [lo, hi];
  for (const k of Object.keys(c) as (keyof LayerConfig)[]) if (c[k] === undefined) delete c[k];
  return Object.keys(c).length ? c : undefined;
}
