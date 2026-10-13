// Small x-y line plot (plain SVG string, tested in node): one series vs u*,th with a zero line
// and a marker at the current threshold. Smooth shape-preserving cubic (PCHIP) through the data
// points, broken at missing values.
import { DARK_THEME, plotLabel, type PlotTheme } from "./plottheme";
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
  const T = o.theme ?? DARK_THEME;
  const k = T.fs.tick / 10; // margins follow the font size
  const W = o.width ?? 360, H = o.height ?? Math.round(170 * Math.max(1, 0.75 * k));
  const m = { l: Math.round(46 * k), r: 10, t: 10, b: Math.round(34 * k) };
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeHtml(o.title)}" class="line-plot">
<g stroke="${T.grid}" stroke-width="${f(0.6 * T.lw)}" fill="none">${yt.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${f(Y(t))}" y2="${f(Y(t))}"${t === 0 ? ` stroke="${T.zero}" stroke-width="1"` : ' stroke-dasharray="2 3"'}/>`).join("")}<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/></g>
<g font-size="${T.fs.tick}" fill="${T.text}">${yt.map((t) => `<text x="${m.l - 4}" y="${f(Y(t) + 0.3 * T.fs.tick)}" text-anchor="end">${tick(t)}</text>`).join("")}${xt.map((t) => `<text x="${f(X(t))}" y="${f(H - m.b + 1.2 * T.fs.tick)}" text-anchor="middle">${tick(t)}</text>`).join("")}
${plotLabel(T, o.xLabel, (m.l + W - m.r) / 2, H - 6, T.fs.tick, { anchor: "middle" })}
<g transform="translate(${f(1.1 * T.fs.tick)} ${f((m.t + H - m.b) / 2)}) rotate(-90)">${plotLabel(T, o.yLabel, 0, 0, T.fs.tick, { anchor: "middle" })}</g></g>
${runs.map((p) => `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`).join("")}
${Number.isFinite(cx) ? `<line class="current" x1="${f(X(cx))}" x2="${f(X(cx))}" y1="${m.t}" y2="${H - m.b}" stroke="${T.currentLine}" stroke-width="0.8" stroke-dasharray="3 2"/>` : ""}${Number.isFinite(cy) ? `<circle cx="${f(X(cx))}" cy="${f(Y(cy))}" r="3.2" fill="${col}" stroke="${T.name === "dark" ? "#141a21" : T.markerStroke}"/>` : ""}
</svg>`;
}
