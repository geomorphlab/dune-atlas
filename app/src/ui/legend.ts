// Legends: colormap bar + clim ticks + units for zarr fields (following the user's colormap /
// clim / log choice), arrow/streamline key for directional render modes, a short note for vectors (no swatch: the fill picker shows the colour).
import type { LayerDef } from "../registry/types";
import { effectiveDisplay, isAxis, scaleNorm, vectorColors, type LayerConfig } from "../layerconfig";
import { mathHtml } from "../util/math";
import { escapeHtml } from "../util/format";
import { richHtml } from "../util/richtext";

function tickLabel(v: number): string {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) return v.toExponential(0).replace("e+", "e");
  return Number(v.toPrecision(3)).toString();
}

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
    const ticks: number[] = [];
    for (let k = Math.ceil(Math.log10(a)); k <= Math.floor(Math.log10(b)); k++) ticks.push(10 ** k);
    return [a, ...ticks.filter((x) => x > a * 1.5 && x < b / 1.5), b];
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
        <span>${e.mode === "arrows" ? "Arrows" : "Streamlines"}: ${what}.${len}${layer.thresholdAware ? ` At current ${mathHtml("$u_{*,th}$")}.` : ""}</span></div>`;
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
      <div class="legend-units">${mathHtml(layer.units ?? "")}${e.scale === "log" ? " (log scale)" : e.scale === "symlog" ? ` (symlog, linear within ±${tickLabel(e.linthresh)})` : ""}${layer.thresholdAware ? ` · at current ${mathHtml("$u_{*,th}$")}` : ""}</div>${layer.display?.legendNote ? `
      <div class="legend-note">${richHtml(layer.display.legendNote)}</div>` : ""}
    </div>`;
  }
  const c = vectorColors(layer, cfg);
  const what = c.invert ? "Land without mapped dunes" : layer.units ?? "";
  // no colour swatch: the fill colour picker above already shows the colour
  return what ? `<div class="legend legend-note">${mathHtml(what)}</div>` : "";
}
