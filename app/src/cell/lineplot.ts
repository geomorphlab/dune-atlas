// Small x-y line plot (plain SVG string, tested in node): one series vs u*,th with a zero line
// and a marker at the current threshold. Smooth shape-preserving cubic (PCHIP) through the data
// points, broken at missing values.
import { DARK_THEME, type PlotTheme } from "./plottheme";
import { escapeHtml } from "../util/format";
import { niceTicks } from "./roses";
import { pchipDense } from "../util/pchip";

export interface LinePlotOptions {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  currentIndex: number;
  xLabel: string;
  yLabel: string;
  title: string;
  width?: number;
  height?: number;
  color?: string;
  theme?: PlotTheme;
}

const f = (v: number) => (Math.round(v * 100) / 100).toString();
const tick = (v: number) => Number(v.toPrecision(3)).toString();

export function linePlotSvg(o: LinePlotOptions): string {
  const W = o.width ?? 360, H = o.height ?? 170;
  const m = { l: 46, r: 10, t: 10, b: 34 };
  const xs = Array.from(o.x), ys = Array.from(o.y);
  const fin = ys.filter(Number.isFinite);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = fin.length ? Math.min(0, ...fin) : -1, y1 = fin.length ? Math.max(0, ...fin) : 1;
  if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1; }
  const pad = 0.06 * (y1 - y0); y0 -= pad; y1 += pad;
  const X = (v: number) => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const Y = (v: number) => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
  // runs of finite values, each drawn as a shape-preserving cubic (PCHIP) through the points
  const runs: string[] = [];
  let cx_: number[] = [], cy_: number[] = [];
  const flush = () => {
    if (cx_.length > 1) { const sm = pchipDense(cx_, cy_, 8); runs.push(sm.x.map((u, i) => `${f(X(u))},${f(Y(sm.y[i]))}`).join(" ")); }
    cx_ = []; cy_ = [];
  };
  ys.forEach((v, k) => { if (!Number.isFinite(v)) { flush(); return; } cx_.push(xs[k]); cy_.push(v); });
  flush();
  const yt = niceTicks(Math.max(Math.abs(y0), Math.abs(y1)), 3).flatMap((t) => [t, -t]).concat([0]).filter((t) => t >= y0 && t <= y1);
  const xt = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].filter((t) => t >= x0 - 1e-9 && t <= x1 + 1e-9);
  const cx = xs[o.currentIndex], cy = ys[o.currentIndex];
  const col = o.color ?? "#e3a33b";
  const T = o.theme ?? DARK_THEME;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeHtml(o.title)}" class="line-plot">
<g stroke="${T.grid}" stroke-width="0.6" fill="none">${yt.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${f(Y(t))}" y2="${f(Y(t))}"${t === 0 ? ` stroke="${T.zero}" stroke-width="1"` : ' stroke-dasharray="2 3"'}/>`).join("")}<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/></g>
<g font-size="10" fill="${T.text}">${yt.map((t) => `<text x="${m.l - 4}" y="${f(Y(t) + 3)}" text-anchor="end">${tick(t)}</text>`).join("")}${xt.map((t) => `<text x="${f(X(t))}" y="${H - m.b + 12}" text-anchor="middle">${tick(t)}</text>`).join("")}
<text x="${f((m.l + W - m.r) / 2)}" y="${H - 6}" text-anchor="middle">${escapeHtml(o.xLabel)}</text>
<text transform="translate(11 ${f((m.t + H - m.b) / 2)}) rotate(-90)" text-anchor="middle">${escapeHtml(o.yLabel)}</text></g>
${runs.map((p) => `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`).join("")}
${Number.isFinite(cx) ? `<line class="current" x1="${f(X(cx))}" x2="${f(X(cx))}" y1="${m.t}" y2="${H - m.b}" stroke="${T.currentLine}" stroke-width="0.8" stroke-dasharray="3 2"/>` : ""}${Number.isFinite(cy) ? `<circle cx="${f(X(cx))}" cy="${f(Y(cy))}" r="3.2" fill="${col}" stroke="${T.name === "dark" ? "#141a21" : T.markerStroke}"/>` : ""}
</svg>`;
}
