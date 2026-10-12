// Polar plot of dune-orientation modes vs threshold: angle = mode bearing (toward, compass),
// radius = u*,th (first value at the centre, last at the rim). Axis modes (alpha_H) are drawn
// both ways. Lines are shape-preserving cubic (PCHIP) interpolations of the unwrapped bearing vs
// u*,th through every data point, broken where a mode is undefined. Plain SVG string (tested in node).
import { angleDiffDeg, bearingToXY, mod } from "../util/angles";
import { pchipDense, unwrapDeg } from "../util/pchip";
import { escapeHtml } from "../util/format";

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
  x: ArrayLike<number>; // u*,th values (m/s), increasing
  series: ModeSeries[];
  currentIndex: number;
  size?: number;
}

const f2 = (v: number) => (Math.round(v * 100) / 100).toString();

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
  const pad = 24;
  const R = size / 2 - pad;
  const cx = size / 2, cy = size / 2;
  const x0 = o.x[0], x1 = o.x[o.x.length - 1];
  const rad = (u: number) => (R * (u - x0)) / (x1 - x0);
  const pt = (b: number, u: number) => { const [x, y] = bearingToXY(b, rad(u)); return [cx + x, cy + y]; };
  const p: string[] = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Polar plot of dune-orientation mode bearings (angle) against threshold friction velocity (radius, ${x0} m/s at the centre to ${x1} m/s at the rim)" class="modes-plot">`);
  p.push(`<g fill="none" stroke="#56606b" stroke-width="0.6">`);
  for (const u of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]) p.push(`<circle cx="${cx}" cy="${cy}" r="${f2(rad(u))}"/>`);
  p.push(`<circle cx="${cx}" cy="${cy}" r="${f2(R)}" stroke="#7a8590"/>`);
  for (let b = 0; b < 360; b += 45) {
    const [x, y] = bearingToXY(b, R);
    p.push(`<line x1="${cx}" y1="${cy}" x2="${f2(cx + x)}" y2="${f2(cy + y)}"${b % 90 ? ' stroke-dasharray="2 3"' : ""}/>`);
  }
  p.push(`</g><g font-size="8.5" fill="#aab4bf" text-anchor="start">`);
  for (const u of [0.2, 0.4, 0.6]) {
    const [x, y] = bearingToXY(67.5, rad(u));
    p.push(`<text x="${f2(cx + x + 1)}" y="${f2(cy + y)}" fill="none" stroke="#11161c" stroke-width="3" stroke-linejoin="round" aria-hidden="true">${u.toFixed(1)}</text>`);
    p.push(`<text x="${f2(cx + x + 1)}" y="${f2(cy + y)}">${u.toFixed(1)}</text>`);
  }
  p.push(`</g><g font-size="11" fill="currentColor" text-anchor="middle">`);
  for (const [lab, b] of [["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const) {
    const [x, y] = bearingToXY(b, R + 11);
    p.push(`<text x="${f2(cx + x)}" y="${f2(cy + y + 4)}">${lab}</text>`);
  }
  p.push(`</g>`);
  const uc = o.x[o.currentIndex];
  p.push(`<circle class="current-ut" cx="${cx}" cy="${cy}" r="${f2(rad(uc))}" fill="none" stroke="#ffd166" stroke-width="1.2" stroke-dasharray="4 3"><title>current u*,th = ${uc.toFixed(2)} m/s</title></circle>`);
  for (const s of o.series) {
    const runs = continuousRuns(s.values, !!s.axis);
    const offsets = s.axis ? [0, 180] : [0];
    for (const off of offsets) {
      for (const run of runs) {
        if (run.length < 2) continue;
        // smooth: shape-preserving cubic of the (unwrapped) bearing vs u*,th, r = u*,th
        const sm = pchipDense(run.map(({ k }) => o.x[k]), unwrapDeg(run.map(({ v }) => v)), 8);
        const d = sm.x.map((u, i) => { const [x, y] = pt(sm.y[i] + off, u); return `${i ? "L" : "M"}${f2(x)},${f2(y)}`; }).join("");
        p.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width ?? 1.8}" stroke-linecap="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}><title>${escapeHtml(s.label)}</title></path>`);
      }
      const v = s.values[o.currentIndex];
      if (Number.isFinite(v)) {
        const [x, y] = pt(v + off, uc);
        p.push(`<circle class="current-mode" cx="${f2(x)}" cy="${f2(y)}" r="3.2" fill="${s.color}" stroke="#11161c" stroke-width="0.8"/>`);
      }
    }
  }
  p.push(`<text x="${size - 4}" y="${size - 5}" font-size="9.5" text-anchor="end" fill="#aab4bf">radius: u*,th (m/s)</text>`);
  p.push(`</svg>`);
  return p.join("");
}
