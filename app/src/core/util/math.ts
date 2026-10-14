// TeX rendering with KaTeX for $...$ segments (titles, units, descriptions, table symbols).
// Plain-text segments are escaped; if KaTeX cannot parse a segment the lightweight
// tex.ts converter is used instead (Unicode + sub/sup), so nothing ever renders as raw TeX.
import katex from "katex";
import { texToHtml } from "./tex";
import { escapeHtml } from "./format";

const cache = new Map<string, string>();

function renderMath(tex: string): string {
  const hit = cache.get(tex);
  if (hit !== undefined) return hit;
  let out: string;
  try {
    // data-tex: the source, so image exports can redraw the formula (export/plotExport katexTex)
    out = katex.renderToString(tex, { throwOnError: true, displayMode: false, output: "html", strict: "ignore" }).replace(/^<span class="katex"/, `<span class="katex" data-tex="${escapeHtml(tex)}"`);
  } catch {
    out = `<span class="tex-fallback" data-tex="${escapeHtml(tex)}">${texToHtml(`$${tex}$`)}</span>`;
  }
  cache.set(tex, out);
  return out;
}

/** "Drift potential $DP$ in m$^2$/s" -> HTML with KaTeX for the math parts. */
export function mathHtml(s: string | undefined | null): string {
  if (!s) return "";
  const parts = s.split("$");
  if (parts.length % 2 === 0) return texToHtml(s); // unbalanced $: fallback
  return parts.map((seg, k) => (k % 2 === 1 ? renderMath(seg) : escapeHtml(seg))).join("");
}

/** Math segments only, joined (e.g. symbol column of the cell table); "" if none. */
export function mathOnly(s: string | undefined | null): string {
  if (!s) return "";
  const parts = s.split("$");
  if (parts.length < 3 || parts.length % 2 === 0) return "";
  return parts.filter((_, k) => k % 2 === 1).join(" ");
}

/** Plain text with math stripped (Quantity column fallback). */
export function textOnly(s: string | undefined | null): string {
  if (!s) return "";
  return s.split("$").filter((_, k) => k % 2 === 0).join("").replace(/\s+/g, " ").trim();
}
