// Earth atlas, Concepts entry "Drift potential (DP)": how the atlas DP relates to Fryberger's DP, for a wind
// blowing at one speed U10 for the whole year (direction does not matter for DP). Top: both DPs against U10
// (two y axes); bottom: their ratio (log axis). Same x axis. A slider sets u*,th (the atlas's threshold
// values, starting at the map's current one); pointing at the plot reads off all values.
//  - atlas: q = FLUXK u*,th (u*^2 - u*,th^2) for u* > u*,th (Martin & Kok 2017; core/cell/flux.ts), with
//    u* = KAPPA U10 / ln(Z/Z0); times S2Y for m^2/yr.
//  - Fryberger & Dean (1979): DP = sum V^2 (V - Vt) t / 100 with V in knots, Vt = 12 knots and t the % of
//    time; for one speed all year (t = 100 %) DP = V^2 (V - 12) vector units (VU).
import { C } from "../util/constants";
import { flatFlux } from "../cell/flux";
import { DARK_THEME } from "../cell/plottheme";
import { h, nextId } from "./dom";
import { mathHtml } from "../util/math";
import { live, padFigure, reserveCh } from "./livenum";
import { tr } from "../../i18n";

export const KNOT = 0.514444; // m/s
export const FRYBERGER_VT_KT = 12;
/** the atlas does not bin hours with U10 > 20 m/s */
export const U_MAX = 20;

export const FRY_TEXT = {
  heading: "Atlas DP and Fryberger DP for a steady wind",
  slider: "Atlas threshold $u_{*,th}$",
  atlas: "Atlas DP (m²/yr)",
  fryberger: "Fryberger DP (VU)",
  ratio: "Atlas DP / Fryberger DP",
  ratioUnits: "(m²/yr per VU)",
  xAxis: "10 m wind speed $U_{10}$ (m/s)",
  knots: "knots",
  hint: "Point at the plot to read off the values.",
  mapValue: "map value",
  mapValueTitle: "Back to the threshold of the map",
  readU: "$U_{10}$:", readAtlas: "Atlas DP:", readFry: "Fryberger DP:", readRatio: "Ratio:",
  caption:
    "For a wind blowing at one speed for the whole year. Atlas DP: the saturated flux of Martin & Kok (2017) from $u_* = \\kappa U_{10} / \\ln(z/z_0)$ with $z_0$ = 1 mm, at the threshold set above. " +
    "Fryberger DP: $V^2(V - V_t)$ with $V$ in knots, $V_t$ = 12 knots and the wind blowing 100 % of the time. " +
    "Dashed lines: the two thresholds; between them only one DP is above zero. " +
    "The ratio changes with wind speed, so there is no fixed conversion factor; for a real wind record it depends on the mix of wind speeds. Hours above 20 m/s are not counted by the atlas.",
};

/** FRY_TEXT in the current language (keys fry.<name>; i18n/catalogue.ts) */
export const fryText = () => Object.fromEntries(Object.entries(FRY_TEXT).map(([k, v]) => [k, tr(`fry.${k}`, v)])) as typeof FRY_TEXT;

export interface FrybergerPoint { u: number; kt: number; atlas: number; fry: number; ratio: number }

/** atlas DP (m²/yr) and Fryberger DP (VU) for a wind of speed u (m/s, 10 m) all year, at threshold ut (m/s) */
export function steadyWindDp(u: number, ut: number): FrybergerPoint {
  const uf = Float64Array.of((u * C.KAPPA) / Math.log(C.Z / C.Z0));
  const atlas = flatFlux(ut, uf)[0] * C.S2Y;
  const kt = u / KNOT;
  const fry = kt > FRYBERGER_VT_KT ? kt * kt * (kt - FRYBERGER_VT_KT) : 0;
  return { u, kt, atlas, fry, ratio: atlas > 0 && fry > 0 ? atlas / fry : NaN };
}

/** 10 m wind speed (m/s) at which u* reaches ut */
export const atlasThresholdSpeed = (ut: number) => (ut * Math.log(C.Z / C.Z0)) / C.KAPPA;

const COL = { atlas: "#e8b25a", fry: "#7fb3e6", ratio: "#9bd18b" };
const W = 380, ML = 46, MR = 46, PW = W - ML - MR;
const TOP = { y0: 22, h: 132 }, BOT = { y0: 178, h: 96 }, H = 306;
const N = 400;
const f2 = (v: number) => (Math.round(v * 100) / 100).toString();

function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
/** readout formats (fixed shapes, so the reserved slot widths below hold): DP values and the ratio */
export function fmtDp(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  if (v < 0.01) return "<0.01";
  if (v < 10) return v.toFixed(2);
  if (v < 100) return v.toFixed(1);
  return Math.round(v).toLocaleString("en");
}
export function fmtRatio(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) return Math.round(v).toLocaleString("en");
  if (v < 0.001) return "<0.001";
  return Number(v.toPrecision(2)).toString();
}
const DP_WIDEST = ["88,888", "88.8", "8.88", "<0.01", "—"];
const RATIO_WIDEST = ["888,888", "0.0088", "<0.001", "—"];
const SPEED_WIDEST = ["88.8", "—"];
const tickText = (v: number) => (v >= 1000 ? `${v / 1000}k` : String(Number(v.toPrecision(3))));

/** the two stacked plots as SVG for threshold ut */
export function frybergerSvg(ut: number): string {
  const F = fryText();
  const T = DARK_THEME;
  const pts = Array.from({ length: N + 1 }, (_, i) => steadyWindDp((U_MAX * i) / N, ut));
  const X = (u: number) => ML + (PW * u) / U_MAX;
  const aMax = niceMax(Math.max(...pts.map((p) => p.atlas)));
  const fMax = niceMax(Math.max(...pts.map((p) => p.fry)));
  const yA = (v: number) => TOP.y0 + TOP.h * (1 - v / aMax);
  const yF = (v: number) => TOP.y0 + TOP.h * (1 - v / fMax);
  // ratio: log axis over whole decades, at most 4 decades below the largest value shown
  const rv = pts.map((p) => p.ratio).filter((r) => r > 0);
  const rHi = rv.length ? 10 ** Math.ceil(Math.log10(Math.min(Math.max(...rv), 1e6))) : 10;
  const rLo = rv.length ? Math.max(10 ** Math.floor(Math.log10(Math.min(...rv))), rHi / 1e4) : 0.01;
  const yR = (v: number) => BOT.y0 + BOT.h * (1 - (Math.log10(v) - Math.log10(rLo)) / (Math.log10(rHi) - Math.log10(rLo)));
  const s: string[] = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" class="fry-svg" aria-label="${F.heading}">`);
  const txt = (x: number, y: number, t: string, o: { anchor?: string; fill?: string; size?: number; rot?: boolean } = {}) =>
    `<text x="${f2(x)}" y="${f2(y)}" font-size="${o.size ?? T.fs.tick}" fill="${o.fill ?? T.label}" text-anchor="${o.anchor ?? "middle"}"${o.rot ? ` transform="rotate(-90 ${f2(x)} ${f2(y)})"` : ""}>${t}</text>`;
  // frames and grids
  for (const P of [TOP, BOT]) s.push(`<rect x="${ML}" y="${P.y0}" width="${PW}" height="${P.h}" fill="none" stroke="${T.grid}" stroke-width="0.8"/>`);
  for (let u = 0; u <= U_MAX; u += 5) {
    for (const P of [TOP, BOT]) s.push(`<line x1="${f2(X(u))}" x2="${f2(X(u))}" y1="${P.y0}" y2="${P.y0 + P.h}" stroke="${T.grid}" stroke-width="0.4" stroke-dasharray="2 3"/>`);
    s.push(txt(X(u), BOT.y0 + BOT.h + 12, String(u)));
  }
  for (let k = 0; k <= U_MAX / KNOT; k += 10) {
    s.push(`<line x1="${f2(X(k * KNOT))}" x2="${f2(X(k * KNOT))}" y1="${TOP.y0 - 3}" y2="${TOP.y0}" stroke="${T.label}" stroke-width="0.8"/>`);
    s.push(txt(X(k * KNOT), TOP.y0 - 6, String(k), { size: T.fs.tick - 1 }));
  }
  s.push(txt(ML + PW + 4, TOP.y0 - 6, F.knots, { anchor: "start", size: T.fs.tick - 1 }));
  for (let g = 0; g <= 4; g++) {
    const y = TOP.y0 + (TOP.h * g) / 4;
    if (g > 0 && g < 4) s.push(`<line x1="${ML}" x2="${ML + PW}" y1="${f2(y)}" y2="${f2(y)}" stroke="${T.grid}" stroke-width="0.4" stroke-dasharray="2 3"/>`);
    s.push(txt(ML - 4, y + 3.5, tickText((aMax * (4 - g)) / 4), { anchor: "end", fill: COL.atlas }));
    s.push(txt(ML + PW + 4, y + 3.5, tickText((fMax * (4 - g)) / 4), { anchor: "start", fill: COL.fry }));
  }
  for (let e = Math.log10(rLo); e <= Math.log10(rHi) + 1e-9; e++) {
    const v = 10 ** e, y = yR(v);
    if (e > Math.log10(rLo) && e < Math.log10(rHi)) s.push(`<line x1="${ML}" x2="${ML + PW}" y1="${f2(y)}" y2="${f2(y)}" stroke="${T.grid}" stroke-width="0.4" stroke-dasharray="2 3"/>`);
    s.push(txt(ML - 4, y + 3.5, Number(v.toPrecision(1)).toString(), { anchor: "end", fill: COL.ratio }));
  }
  s.push(txt(12, TOP.y0 + TOP.h / 2, F.atlas, { rot: true, fill: COL.atlas, size: T.fs.axis }));
  s.push(txt(W - 8, TOP.y0 + TOP.h / 2, F.fryberger, { rot: true, fill: COL.fry, size: T.fs.axis }));
  s.push(txt(12, BOT.y0 + BOT.h / 2, "ratio", { rot: true, fill: COL.ratio, size: T.fs.axis }));
  // thresholds
  const uA = atlasThresholdSpeed(ut), uF = FRYBERGER_VT_KT * KNOT;
  for (const [u, c] of [[uA, COL.atlas], [uF, COL.fry]] as const) {
    if (u > U_MAX) continue;
    for (const P of [TOP, BOT]) s.push(`<line x1="${f2(X(u))}" x2="${f2(X(u))}" y1="${P.y0}" y2="${P.y0 + P.h}" stroke="${c}" stroke-width="1" stroke-dasharray="4 3"/>`);
  }
  // curves (the ratio only where both are above zero)
  const path = (sel: (p: FrybergerPoint) => number, y: (v: number) => number, ok: (p: FrybergerPoint) => boolean) => {
    let d = "", pen = false;
    for (const p of pts) {
      if (!ok(p)) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${f2(X(p.u))},${f2(y(sel(p)))}`; pen = true;
    }
    return d;
  };
  s.push(`<path d="${path((p) => p.fry, yF, () => true)}" fill="none" stroke="${COL.fry}" stroke-width="2"/>`);
  s.push(`<path d="${path((p) => p.atlas, yA, () => true)}" fill="none" stroke="${COL.atlas}" stroke-width="2"/>`);
  s.push(`<clipPath id="fry-clip"><rect x="${ML}" y="${BOT.y0}" width="${PW}" height="${BOT.h}"/></clipPath>`);
  s.push(`<path clip-path="url(#fry-clip)" d="${path((p) => p.ratio, yR, (p) => p.ratio > 0)}" fill="none" stroke="${COL.ratio}" stroke-width="2"/>`);
  // pointer readout (positioned by the figure's script)
  s.push(`<g class="fry-cursor" visibility="hidden"><line y1="${TOP.y0}" y2="${BOT.y0 + BOT.h}" stroke="${T.currentLine}" stroke-width="0.8"/></g>`);
  s.push(`<rect class="fry-hit" x="${ML}" y="${TOP.y0}" width="${PW}" height="${BOT.y0 + BOT.h - TOP.y0}" fill="transparent"/>`);
  s.push(`</svg>`);
  return s.join("");
}

/** readout for a pointed-at speed (HTML; null: nothing pointed at yet): four lines, each ending in a slot
 *  reserved for its widest value, so the text never reflows as the values change (ui/livenum.ts) */
export function readoutHtml(p: FrybergerPoint | null): string {
  const F = fryText();
  const wDp = reserveCh(DP_WIDEST.map((x) => `${x}&nbsp;m²/yr`)), wFry = reserveCh(DP_WIDEST.map((x) => `${x}&nbsp;VU`));
  const wU = reserveCh(SPEED_WIDEST.map((x) => `${x}&nbsp;m/s (${x}&nbsp;knots)`)), wR = reserveCh(RATIO_WIDEST);
  const u = p ? `${p.u.toFixed(1)}&nbsp;m/s (${p.kt.toFixed(1)}&nbsp;knots)` : "—";
  const line = (col: string, label: string, val: string, w: number) =>
    `<span class="fry-line"><span style="color:${col}">${mathHtml(label)}</span> ${live(val, w, "left")}</span>`;
  return line("inherit", F.readU, u, wU) +
    line(COL.atlas, F.readAtlas, p ? `${fmtDp(p.atlas)}&nbsp;m²/yr` : "—", wDp) +
    line(COL.fry, F.readFry, p ? `${fmtDp(p.fry)}&nbsp;VU` : "—", wFry) +
    line(COL.ratio, F.readRatio, p ? fmtRatio(p.ratio) : "—", wR);
}

/** the interactive figure (Earth atlas only); `utIndex` is the index of C.UT_VALUES to start at */
export function frybergerFigure(mapIndex: () => number = () => C.UT_DEFAULT_INDEX): HTMLElement {
  const F = fryText();
  const sid = nextId("fry-ut");
  const clampI = (k: number) => Math.min(Math.max(0, k), C.UT_VALUES.length - 1);
  let i = clampI(mapIndex());
  const input = h("input", { type: "range", id: sid, min: 0, max: C.UT_VALUES.length - 1, step: 1, value: i }) as HTMLInputElement;
  const utText = (v: number) => `${v.toFixed(2)} m/s`;
  const outChars = Math.max(...C.UT_VALUES.map((v) => [...utText(v)].length));
  const out = h("output", { for: sid, class: "ut-value live-num", style: `min-width:${reserveCh(C.UT_VALUES.map(utText))}ch` });
  const back = h("button", { type: "button", class: "link-button", title: F.mapValueTitle }, F.mapValue);
  const plot = h("div", { class: "fry-plot" });
  const read = h("p", { class: "fry-readout", html: readoutHtml(null) });
  const legend = h("p", { class: "fry-legend", html:
    `<span style="color:${COL.atlas}">━ ${F.atlas}</span> <span style="color:${COL.fry}">━ ${F.fryberger}</span> <span style="color:${COL.ratio}">━ ${F.ratio} ${F.ratioUnits}</span>` });
  let lastU: number | null = null;
  const draw = () => {
    const ut = C.UT_VALUES[i];
    if (input.value !== String(i)) input.value = String(i);
    out.textContent = padFigure(utText(ut), outChars);
    input.setAttribute("aria-valuetext", utText(ut));
    plot.innerHTML = frybergerSvg(ut);
    const svg = plot.querySelector("svg") as SVGSVGElement;
    const cur = svg.querySelector(".fry-cursor") as SVGGElement, line = cur.querySelector("line") as SVGLineElement;
    const show = (u: number) => {
      lastU = u;
      const x = ML + (PW * u) / U_MAX;
      line.setAttribute("x1", f2(x)); line.setAttribute("x2", f2(x)); cur.setAttribute("visibility", "visible");
      read.innerHTML = readoutHtml(steadyWindDp(u, ut));
    };
    const at = (ev: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      if (!(r.width > 0)) return;
      const x = ((ev.clientX - r.left) / r.width) * W;
      show(Math.min(U_MAX, Math.max(0, Math.round((((x - ML) / PW) * U_MAX) * 10) / 10)));
    };
    svg.addEventListener("pointermove", at);
    svg.addEventListener("pointerdown", at);
    if (lastU !== null) show(lastU);
  };
  input.addEventListener("input", () => { i = Number(input.value); draw(); });
  back.addEventListener("click", () => { i = clampI(mapIndex()); draw(); });
  draw();
  return h("figure", { class: "fry-fig" },
    h("p", { class: "fry-heading" }, F.heading),
    h("div", { class: "fry-slider" }, h("label", { for: sid, html: mathHtml(F.slider) }), input, out, back),
    plot,
    h("p", { class: "fry-xaxis", html: mathHtml(F.xAxis) }),
    legend, h("p", { class: "fry-hint" }, F.hint), read,
    h("figcaption", { html: mathHtml(F.caption) }));
}
