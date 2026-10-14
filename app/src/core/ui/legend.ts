// Legends: colormap bar + clim ticks + units for zarr fields (following the user's colormap /
// clim / log choice), arrow/streamline key for directional render modes, a short note for vectors (no swatch: the fill picker shows the colour).
import type { LayerDef } from "../registry/types";
import { effectiveDisplay, isAxis, scaleNorm, vectorColors, type LayerConfig } from "../layerconfig";
import { mathHtml } from "../util/math";
import { escapeHtml } from "../util/format";
import { richHtml } from "../util/richtext";
import { PROFILE } from "@body/profile";

/** Colour-bar tick text: plain decimals (0.0005, 0.01, 300, 60000), at most 3 significant digits;
 *  powers of ten only outside 1e-4 .. 1e6, written 10⁻⁵ / 2×10⁶ (never "5e-4"). */
const SUPS: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
export function tickLabel(v: number): string {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e6 || a < 1e-4)) {
    const [m, e] = v.toExponential(0).split("e");
    const pow = `10${String(Number(e)).replace(/./g, (c) => SUPS[c] ?? c)}`;
    return Math.abs(Number(m)) === 1 ? `${Number(m) < 0 ? "-" : ""}${pow}` : `${m}×${pow}`;
  }
  return Number(v.toPrecision(3)).toString();
}
/** interior ticks closer than this (fraction of the bar) to a kept tick are dropped, so end labels never overlap */
export const TICK_MIN_GAP = 0.12;

export function legendTicks(layer: LayerDef, cfg?: LayerConfig): number[] {
  const e = effectiveDisplay(layer, cfg);
  const [a, b] = e.clim;
  const t = layer.display?.transform;
  if (t === "rad-to-bearing" && a === 0 && b === 360) return [0, 90, 180, 270, 360];
  if (t === "rad-to-axis" && a === 0 && b === 180) return [0, 45, 90, 135, 180];
  const custom = layer.display?.ticks;
  if (custom && !cfg?.clim) return [a, ...custom.filter((x) => x > a && x < b), b];
  if (e.scale === "symlog") {
    // symmetric decades +-c 10^k inside the limits, plus 0 and the limits; drop ticks that would
    // sit too close to an already placed one (larger magnitudes placed first)
    const c = e.linthresh;
    const cand: number[] = [];
    for (let k = 0; c * 10 ** k < Math.max(-a, b); k++) for (const sgn of [1, -1]) { const v = sgn * c * 10 ** k; if (v > a && v < b) cand.push(v); }
    const kept = [a, b, 0];
    for (const v of cand.sort((x, y) => Math.abs(y) - Math.abs(x))) {
      const p = tickPosition(layer, v, cfg);
      if (kept.every((w) => Math.abs(tickPosition(layer, w, cfg) - p) >= 0.05)) kept.push(v);
    }
    return kept.sort((x, y) => x - y);
  }
  if (e.log) {
    // decades inside the limits; one that would sit within TICK_MIN_GAP of an end (or of the last kept
    // decade) is dropped rather than staggered (the ERA5-Land DP end labels would otherwise overlap)
    const pos = (x: number) => tickPosition(layer, x, cfg);
    const kept = [a];
    for (let k = Math.ceil(Math.log10(a)); k <= Math.floor(Math.log10(b)); k++) {
      const x = 10 ** k;
      if (x > a && x < b && pos(x) - pos(kept[kept.length - 1]) >= TICK_MIN_GAP && pos(b) - pos(x) >= TICK_MIN_GAP) kept.push(x);
    }
    return [...kept, b];
  }
  return [a, (a + b) / 2, b];
}

export function tickPosition(layer: LayerDef, v: number, cfg?: LayerConfig): number {
  return scaleNorm(effectiveDisplay(layer, cfg), v);
}

function gradient(colors: string[], n = 16): string {
  const stops = Array.from({ length: n }, (_, i) => colors[Math.round((i / (n - 1)) * (colors.length - 1))]);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function legendHtml(layer: LayerDef, cfg?: LayerConfig): string {
  if (layer.type === "zarr-field") {
    const e = effectiveDisplay(layer, cfg);
    if (e.mode !== "colormap") {
      const what = isAxis(layer) ? "orientation axis (headless)" : "direction of transport (toward)";
      const len = e.mode === "arrows" ? " Arrow length and opacity scale with the paired flux magnitude where available." : "";
      return `<div class="legend legend-vec"><svg width="34" height="10" aria-hidden="true"><line x1="2" y1="5" x2="30" y2="5" stroke="${escapeHtml(e.vecColor)}" stroke-width="1.6"/>${e.mode === "arrows" && !isAxis(layer) ? `<path d="M30,5 L24,2 M30,5 L24,8" stroke="${escapeHtml(e.vecColor)}" stroke-width="1.6"/>` : ""}</svg>
        <span>${e.mode === "arrows" ? "Arrows" : "Streamlines"}: ${what}.${len}${layer.thresholdAware ? ` At current ${mathHtml(PROFILE.control.symbolTex)}.` : ""}</span></div>`;
    }
    const ticks = legendTicks(layer, cfg);
    const deg = layer.display?.transform === "rad-to-bearing" || layer.display?.transform === "rad-to-axis";
    // stagger labels that would collide (e.g. 0.5 / 0.65 on a log scale)
    let lastPos = -1, lastLow = false;
    const top = layer.display?.topLabel && !cfg?.clim ? layer.display.topLabel : undefined;
    const labels = ticks.map((v, k) => {
      const pos = tickPosition(layer, v, cfg);
      const low = k > 0 && !lastLow && pos - lastPos < 0.09;
      lastLow = low; lastPos = pos;
      const text = k === ticks.length - 1 && top ? top : deg ? `${v}°` : tickLabel(v);
      return `<span class="${low ? "low" : ""}" style="left:${(100 * pos).toFixed(1)}%">${escapeHtml(text)}</span>`;
    }).join("");
    const marks = layer.display?.ticks && !cfg?.clim ? ticks.slice(1, -1).map((v) => `<i style="left:${(100 * tickPosition(layer, v, cfg)).toFixed(1)}%"></i>`).join("") : "";
    const staggered = labels.includes('class="low"');
    return `<div class="legend" role="img" aria-label="${escapeHtml(`Colour scale ${e.scale === "log" ? "(logarithmic) " : e.scale === "symlog" ? "(symmetric logarithmic) " : ""}from ${ticks[0]} to ${ticks[ticks.length - 1]}`)}">
      <div class="legend-bar" style="background:${gradient(e.colors)}" title="values outside the range are shown at the end colours">${marks}</div>
      <div class="legend-ticks${staggered ? " staggered" : ""}">${labels}</div>
      <div class="legend-units">${mathHtml(layer.units ?? "")}${e.scale === "log" ? " (log scale)" : e.scale === "symlog" ? ` (symlog, linear within ±${tickLabel(e.linthresh)})` : ""}${layer.thresholdAware ? ` · at current ${mathHtml(PROFILE.control.symbolTex)}` : ""}</div>${layer.display?.legendNote ? `
      <div class="legend-note">${richHtml(layer.display.legendNote)}</div>` : ""}
    </div>`;
  }
  const c = vectorColors(layer, cfg);
  const what = c.invert ? PROFILE.invert.legend : layer.units ?? "";
  // no colour swatch: the fill colour picker above already shows the colour
  return what ? `<div class="legend legend-note">${mathHtml(what)}</div>` : "";
}
