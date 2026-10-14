// Text with TeX math ($...$ segments) for the exported SVG / PNG images: the math is drawn as SVG
// paths (MathJax SVG output, glyphs embedded, no font dependence; loaded lazily, only when
// exporting), the text as <text> runs placed with Helvetica / Arial advance widths (metric-
// compatible fonts in browsers and resvg). Without a renderer (or if it failed to load), math
// falls back to readable plain text (texToPlain). Pure string builders (tested).
import { escapeHtml } from "../util/format";
import { texToPlain } from "../util/plaintext";

/** a rendered formula: SVG markup in a coordinate system of 1/1000 em, baseline at y = 0; width,
 *  ascent and descent in em */
export interface MathBox { body: string; w: number; a: number; d: number }
export interface MathRenderer { render(tex: string): MathBox }

let loading: Promise<MathRenderer | null> | null = null;
/** the MathJax renderer, loaded on first use (a separate chunk); null if it cannot be loaded */
export function loadMathRenderer(): Promise<MathRenderer | null> {
  return (loading ??= import("./mathjax").then((m) => m.createMathRenderer()).catch((e) => {
    console.warn("[dune-atlas] math renderer unavailable, exporting symbols as plain text", e);
    loading = null;
    return null;
  }));
}

/** math is drawn a little larger than the text em so its x-height matches Helvetica's */
export const MATH_SCALE = 1.18;

// Helvetica / Arial advance widths (1/1000 em), regular and bold (AFM)
const REG: Record<string, number> = {};
const BOLD: Record<string, number> = {};
const put = (t: Record<string, number>, chars: string, w: number) => { for (const c of chars) t[c] = w; };
put(REG, " !,./:;I[\\]ft", 278); put(REG, "ijl", 222); put(REG, "\"", 355); put(REG, "#$0123456789?L_abdeghnopqu", 556);
put(REG, "%", 889); put(REG, "&ABEKPSVXY", 667); put(REG, "'", 191); put(REG, "()-`r{}", 333); put(REG, "*", 389); put(REG, "+<=>|~", 584);
put(REG, "@", 1015); put(REG, "CDHNRUw", 722); put(REG, "FTZ", 611); put(REG, "GOQ", 778); put(REG, "J", 500); put(REG, "Mm", 833);
put(REG, "W", 944); put(REG, "ckvxyzs", 500); put(REG, "^", 469); put(REG, "°", 400); put(REG, "·", 278);
put(REG, "–", 556); put(REG, "—", 1000); put(REG, "×", 584); put(REG, "’‘", 222); put(REG, "“”", 333); put(REG, "²³¹", 333); put(REG, "©", 737);
put(REG, "≥≤±", 584); put(REG, "αβγδεθλμπρστφω", 556); put(REG, "∇", 667); put(REG, "⟨⟩", 333); put(REG, "∥⊥", 584);
put(BOLD, " ,./I[\\]ij", 278); put(BOLD, "l", 278); put(BOLD, "!:;()-`{}ft", 333); put(BOLD, "r", 389);
put(BOLD, "\"", 474); put(BOLD, "#$0123456789aes_", 556); put(BOLD, "L?", 611); put(BOLD, "%", 889);
put(BOLD, "&ABCDHKNRU", 722); put(BOLD, "EPSVXY", 667); put(BOLD, "'", 238); put(BOLD, "*", 389); put(BOLD, "+<=>|~", 584); put(BOLD, "@", 975);
put(BOLD, "FTZ", 611); put(BOLD, "GOQ", 778); put(BOLD, "J", 556); put(BOLD, "M", 833); put(BOLD, "m", 889);
put(BOLD, "W", 944); put(BOLD, "w", 778); put(BOLD, "bdghnopqu", 611); put(BOLD, "ckvxy", 556); put(BOLD, "z", 500);
put(BOLD, "°", 400); put(BOLD, "·", 278); put(BOLD, "–", 556); put(BOLD, "—", 1000); put(BOLD, "×", 584); put(BOLD, "’‘", 278); put(BOLD, "αβγδεθλμπρστφω", 611);
put(BOLD, "∇", 722); put(BOLD, "⟨⟩", 333); put(BOLD, "∥⊥", 584);

/** advance width of plain text (px at font size fs) */
export function textWidth(s: string, fs: number, bold = false): number {
  const t = bold ? BOLD : REG, def = bold ? 611 : 556;
  let w = 0;
  for (const c of s) w += t[c] ?? def;
  return (w / 1000) * fs;
}

export type Seg = { t: "text"; s: string } | { t: "math"; tex: string };

/** "a $x$ b" -> text / math segments; without a renderer the math becomes plain text */
export function splitTex(s: string, math?: MathRenderer | null): Seg[] {
  const out: Seg[] = [];
  const parts = s.split("$");
  parts.forEach((p, k) => {
    const isMath = k % 2 === 1 && k <= parts.length - 2;
    if (isMath) out.push(math ? { t: "math", tex: p } : { t: "text", s: texToPlain(`$${p}$`) });
    else if (p || k % 2 === 1) out.push({ t: "text", s: k % 2 === 1 ? `$${p}` : p });
  });
  const m: Seg[] = [];
  for (const g of out) { const last = m[m.length - 1]; if (g.t === "text" && last?.t === "text") last.s += g.s; else m.push({ ...g }); }
  return m;
}

const boxCache = new WeakMap<MathRenderer, Map<string, MathBox>>();
function box(math: MathRenderer, tex: string): MathBox {
  let c = boxCache.get(math);
  if (!c) boxCache.set(math, (c = new Map()));
  let b = c.get(tex);
  if (!b) { b = math.render(tex); c.set(tex, b); }
  return b;
}

const segW = (g: Seg, fs: number, bold: boolean, math?: MathRenderer | null) => (g.t === "text" ? textWidth(g.s, fs, bold) : math ? box(math, g.tex).w * fs * MATH_SCALE : 0);
/** width of a run of segments */
export function richWidth(segs: Seg[], fs: number, bold = false, math?: MathRenderer | null): number {
  return segs.reduce((a, g) => a + segW(g, fs, bold, math), 0);
}
const merge = (l: Seg[]) => { const m: Seg[] = []; for (const g of l) { const last = m[m.length - 1]; if (g.t === "text" && last?.t === "text") last.s += g.s; else m.push({ ...g }); } return m; };

/** greedy word wrap of text with math (formulas never break) */
export function wrapRich(s: string, width: number, fs: number, o: { bold?: boolean; math?: MathRenderer | null } = {}): Seg[][] {
  const lines: Seg[][] = [];
  for (const para of s.split("\n")) {
    // words: maximal runs without white space (text pieces and formulas)
    const words: Seg[][] = [];
    let cur: Seg[] = [];
    for (const g of splitTex(para, o.math)) {
      if (g.t === "math") { cur.push(g); continue; }
      for (const piece of g.s.split(/(\s+)/)) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) { if (cur.length) words.push(cur); cur = []; }
        else cur.push({ t: "text", s: piece });
      }
    }
    if (cur.length) words.push(cur);
    const sp = textWidth(" ", fs, o.bold);
    let line: Seg[] = [], lw = 0;
    for (const w of words) {
      const ww = richWidth(w, fs, o.bold, o.math);
      if (line.length && lw + sp + ww > width) { lines.push(merge(line)); line = []; lw = 0; }
      if (line.length) { line.push({ t: "text", s: " " }); lw += sp; }
      line.push(...w); lw += ww;
    }
    lines.push(merge(line));
  }
  return lines;
}

const f = (v: number) => (Math.round(v * 100) / 100).toString();
export interface RichOpts { anchor?: "start" | "middle" | "end"; bold?: boolean; fill: string; cls?: string; math?: MathRenderer | null; extra?: string }

/** one line of segments at (x, baseline y); text runs as <text>, formulas as <g class="math"> */
export function richLine(segs: Seg[], x: number, y: number, fs: number, o: RichOpts): string {
  const textEl = (xx: number, s: string, anchor?: string) => `<text${o.cls ? ` class="${o.cls}"` : ""} x="${f(xx)}" y="${f(y)}" font-size="${f(fs)}"${o.bold ? ' font-weight="700"' : ""}${anchor && anchor !== "start" ? ` text-anchor="${anchor}"` : ""} fill="${o.fill}"${o.extra ?? ""}>${escapeHtml(s)}</text>`;
  if (!segs.some((g) => g.t === "math")) return textEl(x, segs.map((g) => (g.t === "text" ? g.s : "")).join("").trim(), o.anchor);
  const total = richWidth(segs, fs, o.bold, o.math);
  let cx = o.anchor === "middle" ? x - total / 2 : o.anchor === "end" ? x - total : x;
  const out: string[] = [];
  for (const g of segs) {
    if (g.t === "text") {
      const lead = g.s.length - g.s.trimStart().length;
      const s = g.s.trim();
      if (s) out.push(textEl(cx + textWidth(g.s.slice(0, lead), fs, o.bold), s));
      cx += textWidth(g.s, fs, o.bold);
    } else if (o.math) {
      const b = box(o.math, g.tex), sc = (fs * MATH_SCALE) / 1000;
      out.push(`<g class="math${o.cls ? ` ${o.cls}` : ""}" data-tex="${escapeHtml(g.tex)}" transform="translate(${f(cx)} ${f(y)}) scale(${+sc.toFixed(6)})" fill="${o.fill}" stroke="none">${b.body.replace(/currentColor/g, o.fill)}</g>`);
      cx += b.w * fs * MATH_SCALE;
    }
  }
  return out.join("");
}

/** a single line of TeX-ish text */
export function richText(s: string, x: number, y: number, fs: number, o: RichOpts): string {
  return richLine(splitTex(s, o.math), x, y, fs, o);
}

/** units in exported text as TeX (upright, superscripts): m²/yr -> $\mathrm{m^{2}\,yr^{-1}}$, also
 *  m²/s, m/kyr, m/s */
export function unitsTex(s: string): string {
  return s
    .replace(/m²\/yr/g, "$\\mathrm{m^{2}\\,yr^{-1}}$").replace(/m²\/s/g, "$\\mathrm{m^{2}\\,s^{-1}}$")
    .replace(/m\/kyr/g, "$\\mathrm{m\\,kyr^{-1}}$").replace(/(\d|\s|^|\()m\/s\b/g, "$1$\\mathrm{m\\,s^{-1}}$");
}
/** TeX units */
export const U_TEX = { m2yr: "$\\mathrm{m^{2}\\,yr^{-1}}$", ms: "$\\mathrm{m\\,s^{-1}}$", mkyr: "$\\mathrm{m\\,kyr^{-1}}$" } as const;
