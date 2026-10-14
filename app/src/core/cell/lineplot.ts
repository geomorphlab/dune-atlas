// Small x-y line plot (plain SVG string, tested in node): one series vs u*,th with a zero line
// and a marker at the current threshold. Smooth shape-preserving cubic (PCHIP) through the data
// points; options for fixed / cyclic / logarithmic y axes and off-scale (sentinel) values (cell panel
// "<quantity> vs threshold" plot, cell/qplot.ts).
import { DARK_THEME, plotLabel, type PlotTheme } from "./plottheme";
import { escapeHtml } from "../util/format";
import { niceTicks } from "./roses";
import { pchipDense } from "../util/pchip";
import { PROFILE } from "@body/profile";

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
  /** fixed y range (direction fields: [0, 360] or [0, 180]); default: autoscale over the finite values */
  yRange?: [number, number];
  /** y tick values (with yRange) */
  yTicks?: number[];
  /** cyclic values (360 bearings, 180 axes): the line breaks where it wraps (|step| > wrap / 2) */
  wrap?: number;
  /** |y| >= sentinel is off scale (e.g. ±60,000 = infinite ratio): left out of the autoscale and the line,
   *  marked by a triangle at the top (positive) or bottom (negative) edge */
  sentinel?: number;
  /** logarithmic y axis (positive values only; others break the line) */
  logY?: boolean;
}

const f = (v: number) => (Math.round(v * 100) / 100).toString();
const tick = (v: number) => Number(v.toPrecision(3)).toString();
/** x tick text (the body's, e.g. d in µm from log10 d; default 3 significant digits) */
const xTick = (t: number) => PROFILE.control.plot.lineTickText?.(t) ?? tick(t);
/** y tick text on a log axis: plain decimals (0.001, 0.1, 10, 1000) */
const logTick = (v: number) => (v >= 1e-4 && v < 1e6 ? Number(v.toPrecision(3)).toString() : v.toExponential(0).replace("e+", "e"));

export function linePlotSvg(o: LinePlotOptions): string {
  const T = o.theme ?? DARK_THEME;
  const k = T.fs.tick / 10; // margins follow the font size
  const W = o.width ?? 360, H = o.height ?? Math.round(170 * Math.max(1, 0.75 * k));
  const xs = Array.from(o.x), ys = Array.from(o.y);
  const off = (v: number) => o.sentinel !== undefined && Number.isFinite(v) && Math.abs(v) >= o.sentinel * 0.999;
  const ok = (v: number) => Number.isFinite(v) && !off(v) && (!o.logY || v > 0);
  const tv = (v: number) => (o.logY ? Math.log10(v) : v);
  const fin = ys.filter(ok).map(tv);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const xt = PROFILE.control.plot.lineTicks.filter((t) => t >= x0 - 1e-9 && t <= x1 + 1e-9);
  // right margin: room for half of the last x tick label (e.g. "1000" was clipped to "100" on Mars)
  const last = xt.length ? xTick(xt[xt.length - 1]) : "";
  const lastAtEdge = xt.length > 0 && (x1 - xt[xt.length - 1]) / (x1 - x0 || 1) < 0.08;
  const m = { l: Math.round(46 * k), r: Math.max(10, lastAtEdge ? Math.ceil(0.31 * T.fs.tick * last.length) + 3 : 10), t: 10, b: Math.round(34 * k) };
  let y0: number, y1: number;
  if (o.yRange) [y0, y1] = o.yRange;
  else {
    y0 = fin.length ? Math.min(...(o.logY ? fin : [0, ...fin])) : -1; y1 = fin.length ? Math.max(...(o.logY ? fin : [0, ...fin])) : 1;
    if (y1 - y0 < 1e-12) { y0 -= o.logY ? 0.5 : 1; y1 += o.logY ? 0.5 : 1; }
    const pad = 0.06 * (y1 - y0); y0 -= pad; y1 += pad;
  }
  const X = (v: number) => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const Yt = (t: number) => H - m.b - ((t - y0) / (y1 - y0)) * (H - m.t - m.b);
  const Y = (v: number) => Yt(tv(v));
  // runs of plotted values, each drawn as a shape-preserving cubic (PCHIP) through the points; breaks at
  // missing / off-scale values and, for cyclic values, where the series wraps
  const runs: string[] = [];
  let cx_: number[] = [], cy_: number[] = [];
  const flush = () => {
    if (cx_.length > 1) { const sm = pchipDense(cx_, cy_, 8); runs.push(sm.x.map((u, i) => `${f(X(u))},${f(Yt(sm.y[i]))}`).join(" ")); }
    else if (cx_.length === 1) runs.push(`${f(X(cx_[0]) - 0.8)},${f(Yt(cy_[0]))} ${f(X(cx_[0]) + 0.8)},${f(Yt(cy_[0]))}`);
    cx_ = []; cy_ = [];
  };
  ys.forEach((v, j) => {
    if (!ok(v)) { flush(); return; }
    if (o.wrap && cy_.length && Math.abs(tv(v) - cy_[cy_.length - 1]) > o.wrap / 2) flush();
    cx_.push(xs[j]); cy_.push(tv(v));
  });
  flush();
  let yt: number[], ytl: (t: number) => string = tick;
  if (o.yTicks) yt = o.yTicks.filter((t) => t >= y0 - 1e-9 && t <= y1 + 1e-9);
  else if (o.logY) {
    yt = []; for (let e = Math.ceil(y0); e <= Math.floor(y1); e++) yt.push(e);
    if (yt.length > 5) yt = yt.filter((e) => e % 2 === 0);
    ytl = (t) => logTick(10 ** t);
  } else yt = niceTicks(Math.max(Math.abs(y0), Math.abs(y1)), 3).flatMap((t) => [t, -t]).concat([0]).filter((t) => t >= y0 && t <= y1);
  const zeroLine = !o.logY && !o.yRange;
  const cx = xs[o.currentIndex], cy = ys[o.currentIndex];
  const col = o.color ?? "#e3a33b";
  const tri = (j: number) => { const x = X(xs[j]), up = ys[j] > 0, y = up ? m.t : H - m.b; return `<path class="offscale" d="M${f(x)},${f(y)} l${f(-3.5)},${f(up ? 6 : -6)} h7 z" fill="${col}"/>`; };
  const offs = ys.map((v, j) => (off(v) ? j : -1)).filter((j) => j >= 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeHtml(o.title)}" class="line-plot">
<g stroke="${T.grid}" stroke-width="${f(0.6 * T.lw)}" fill="none">${yt.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${f(Yt(t))}" y2="${f(Yt(t))}"${t === 0 && zeroLine ? ` stroke="${T.zero}" stroke-width="1"` : ' stroke-dasharray="2 3"'}/>`).join("")}<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/></g>
<g font-size="${T.fs.tick}" fill="${T.text}">${yt.map((t) => `<text x="${m.l - 4}" y="${f(Yt(t) + 0.3 * T.fs.tick)}" text-anchor="end">${ytl(t)}</text>`).join("")}${xt.map((t) => `<text x="${f(X(t))}" y="${f(H - m.b + 1.2 * T.fs.tick)}" text-anchor="middle">${xTick(t)}</text>`).join("")}
${plotLabel(T, o.xLabel, (m.l + W - m.r) / 2, H - 6, T.fs.tick, { anchor: "middle" })}
<g transform="translate(${f(1.1 * T.fs.tick)} ${f((m.t + H - m.b) / 2)}) rotate(-90)">${plotLabel(T, o.yLabel, 0, 0, T.fs.tick, { anchor: "middle" })}</g></g>
${runs.map((p) => `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`).join("")}
${offs.map(tri).join("")}
${Number.isFinite(cx) ? `<line class="current" x1="${f(X(cx))}" x2="${f(X(cx))}" y1="${m.t}" y2="${H - m.b}" stroke="${T.currentLine}" stroke-width="0.8" stroke-dasharray="3 2"/>` : ""}${ok(cy) ? `<circle cx="${f(X(cx))}" cy="${f(Y(cy))}" r="3.2" fill="${col}" stroke="${T.name === "dark" ? "#141a21" : T.markerStroke}"/>` : ""}
</svg>`;
}
