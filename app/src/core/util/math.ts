// TeX rendering with KaTeX for $...$ segments (titles, units, descriptions, table symbols).
// Plain-text segments are escaped; if KaTeX cannot parse a segment the lightweight
// tex.ts converter is used instead (Unicode + sub/sup), so nothing ever renders as raw TeX.
// Page translators must not touch the maths: every formula carries translate="no", a space next to a
// formula is kept inside a protected wrapper (so a translated sentence keeps its space before the symbol),
// and the acronyms and names of the plain text are protected too (util/notranslate.ts).
import katex from "katex";
import { texToHtml } from "./tex";
import { escapeHtml } from "./format";
import { NO_TRANSLATE_ATTRS, protectEscaped, protectHtml } from "./notranslate";

const cache = new Map<string, string>();

function renderMath(tex: string): string {
  const hit = cache.get(tex);
  if (hit !== undefined) return hit;
  let out: string;
  try {
    // data-tex: the source, so image exports can redraw the formula (export/plotExport katexTex)
    out = katex.renderToString(tex, { throwOnError: true, displayMode: false, output: "html", strict: "ignore" }).replace(/^<span class="katex"/, `<span class="katex" translate="no" data-tex="${escapeHtml(tex)}"`);
  } catch {
    out = `<span class="tex-fallback" translate="no" data-tex="${escapeHtml(tex)}">${texToHtml(`$${tex}$`)}</span>`;
  }
  cache.set(tex, out);
  return out;
}

/** "Drift potential $DP$ in m$^2$/s" -> HTML with KaTeX for the math parts. */
export function mathHtml(s: string | undefined | null): string {
  if (!s) return "";
  const parts = s.split("$");
  if (parts.length % 2 === 0) return protectHtml(texToHtml(s)); // unbalanced $: fallback
  // one space on each side of a formula goes inside its protected wrapper (the text order is unchanged)
  let out = "", lead = false;
  parts.forEach((seg, k) => {
    if (k % 2 === 0) {
      let t = seg;
      if (k > 0 && t.startsWith(" ")) t = t.slice(1);   // taken by the formula before
      lead = k < parts.length - 1 && t.endsWith(" ");
      if (lead) t = t.slice(0, -1);                     // taken by the formula after
      out += protectEscaped(escapeHtml(t));
      return;
    }
    const before = lead ? " " : "", after = parts[k + 1]?.startsWith(" ") ? " " : "";
    out += before || after ? `<span ${NO_TRANSLATE_ATTRS}>${before}${renderMath(seg)}${after}</span>` : renderMath(seg);
  });
  return out;
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
