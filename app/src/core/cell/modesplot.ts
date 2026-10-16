// Polar plot of dune-orientation modes vs threshold: angle = mode bearing (toward, compass),
// radius = u*,th (first value at the centre, last at the rim). Axis modes (alpha_H) are drawn
// both ways. Lines are shape-preserving cubic (PCHIP) interpolations of the unwrapped bearing vs
// u*,th through every data point, broken where a mode is undefined. Plain SVG string (tested in node).
import { DARK_THEME, plotLabel, type PlotTheme } from "./plottheme";
import { angleDiffDeg, bearingToXY, mod } from "../util/angles";
import { pchipDense, unwrapDeg } from "../util/pchip";
import { escapeHtml } from "../util/format";
import { PROFILE } from "@body/profile";

export interface ModeSeries {
  label: string;
  color: string;
  /** bearings (deg) per threshold; NaN = no value */
  values: ArrayLike<number>;
  /** unsigned axis (0-180): draw at theta and theta + 180 */
  axis?: boolean;
  dash?: string;
  width?: number;
}

export interface ModesPlotOptions {
  /** radius axis label (may contain TeX) */
  radiusLabel?: string;
  x: ArrayLike<number>; // u*,th values (m/s), increasing
  series: ModeSeries[];
  currentIndex: number;
  size?: number;
  theme?: PlotTheme;
}

const f2 = (v: number) => (Math.round(v * 100) / 100).toString();
/** largest bearing change (deg) along one straight piece of a drawn trace */
const MAX_STEP_DEG = 1.5;

/** Split a bearing series into continuous runs (break at NaN or jumps > maxJump deg). For axes
 *  the values are unwrapped mod 180 so the trace stays continuous across 0/180. */
export function continuousRuns(values: ArrayLike<number>, axis: boolean, maxJump = axis ? 45 : 90): { k: number; v: number }[][] {
  const runs: { k: number; v: number }[][] = [];
  let cur: { k: number; v: number }[] = [];
  let prev = NaN;
  for (let k = 0; k < values.length; k++) {
    let v = values[k];
    if (!Number.isFinite(v)) { if (cur.length) runs.push(cur); cur = []; prev = NaN; continue; }
    if (axis) {
      v = mod(v, 180);
      if (Number.isFinite(prev) && Math.abs(angleDiffDeg(v + 180, prev)) < Math.abs(angleDiffDeg(v, prev))) v = v + 180;
    }
    if (Number.isFinite(prev) && Math.abs(angleDiffDeg(v, prev)) > maxJump) { runs.push(cur); cur = []; }
    cur.push({ k, v });
    prev = v;
  }
  if (cur.length) runs.push(cur);
  return runs;
}

export function modesPlotSvg(o: ModesPlotOptions): string {
  const size = o.size ?? 280;
  const pad = Math.max(24, 2 * (o.theme ?? DARK_THEME).fs.compass);
  const R = size / 2 - pad;
  const cx = size / 2, cy = size / 2;
  const x0 = o.x[0], x1 = o.x[o.x.length - 1];
  const rad = (u: number) => (R * (u - x0)) / (x1 - x0);
  const pt = (b: number, u: number) => { const [x, y] = bearingToXY(b, rad(u)); return [cx + x, cy + y]; };
  const p: string[] = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Polar plot of dune-orientation mode bearings (angle) against ${PROFILE.control.plot.ariaRange(x0, x1)}" class="modes-plot">`);
  const T = o.theme ?? DARK_THEME;
  p.push(`<g fill="none" stroke="${T.grid}" stroke-width="${f2(0.6 * T.lw)}">`);
  for (const u of PROFILE.control.plot.rings) p.push(`<circle cx="${cx}" cy="${cy}" r="${f2(rad(u))}"/>`);
  p.push(`<circle cx="${cx}" cy="${cy}" r="${f2(R)}" stroke="${T.gridStrong}"/>`);
  for (let b = 0; b < 360; b += 45) {
    const [x, y] = bearingToXY(b, R);
    p.push(`<line x1="${cx}" y1="${cy}" x2="${f2(cx + x)}" y2="${f2(cy + y)}"${b % 90 ? ' stroke-dasharray="2 3"' : ""}/>`);
  }
  p.push(`</g><g font-size="${T.fs.ring}" fill="${T.label}" text-anchor="start">`);
  for (const u of PROFILE.control.plot.ringLabels) {
    const [x, y] = bearingToXY(67.5, rad(u));
    p.push(`<text x="${f2(cx + x + 1)}" y="${f2(cy + y)}">${PROFILE.control.plot.ringText(u)}</text>`);
  }
  p.push(`</g><g font-size="${T.fs.compass}" fill="${T.text}" text-anchor="middle">`);
  for (const [lab, b] of [["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const) {
    const [x, y] = bearingToXY(b, R + 0.95 * T.fs.compass);
    p.push(`<text x="${f2(cx + x)}" y="${f2(cy + y + 0.36 * T.fs.compass)}">${lab}</text>`);
  }
  p.push(`</g>`);
  const uc = o.x[o.currentIndex];
  p.push(`<circle class="current-ut" cx="${cx}" cy="${cy}" r="${f2(rad(uc))}" fill="none" stroke="${T.current}" stroke-width="${f2(1.2 * T.lw)}" stroke-dasharray="4 3"><title>${PROFILE.control.plot.currentTitle(uc)}</title></circle>`);
  for (const s of o.series) {
    const runs = continuousRuns(s.values, !!s.axis);
    const offsets = s.axis ? [0, 180] : [0];
    for (const off of offsets) {
      for (const run of runs) {
        if (run.length < 2) continue;
        // smooth: shape-preserving cubic of the (unwrapped) bearing vs u*,th, r = u*,th; sampled densely enough that
        // no straight piece of the path turns by more than MAX_STEP_DEG (a mode that swings fast near the rim stays a curve)
        const ys = unwrapDeg(run.map(({ v }) => v));
        let swing = 0;
        for (let i = 1; i < ys.length; i++) swing = Math.max(swing, Math.abs(ys[i] - ys[i - 1]));
        const sm = pchipDense(run.map(({ k }) => o.x[k]), ys, Math.max(8, Math.ceil(swing / MAX_STEP_DEG)));
        const d = sm.x.map((u, i) => { const [x, y] = pt(sm.y[i] + off, u); return `${i ? "L" : "M"}${f2(x)},${f2(y)}`; }).join("");
        p.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${f2((s.width ?? 1.8) * (T.lw > 1 ? 1.4 : 1))}" stroke-linecap="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}><title>${escapeHtml(s.label)}</title></path>`);
      }
      const v = s.values[o.currentIndex];
      if (Number.isFinite(v)) {
        const [x, y] = pt(v + off, uc);
        p.push(`<circle class="current-mode" cx="${f2(x)}" cy="${f2(y)}" r="${f2(3.2 * T.lw)}" fill="${s.color}" stroke="${T.markerStroke}" stroke-width="0.8"/>`);
      }
    }
  }
  p.push(plotLabel(T, o.radiusLabel ?? PROFILE.control.plot.radiusLabel, size - 4, size - 5, T.fs.axis, { anchor: "end", fill: T.label }));
  p.push(`</svg>`);
  return p.join("");
}
