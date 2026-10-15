// Text that a browser's page translator (Chrome / Google Translate, Edge / Microsoft Translator, Safari, …)
// must leave as written: symbols and acronyms (DP, RDP, RDD, RDP/DP, AI, u*,th, αT, …), dataset, product,
// provider and brand names (ERA5-Land, MCMC FV3, Mapterhorn, OpenStreetMap, Dune Atlas, …), licence names
// (CC BY 4.0, ODbL 1.0, MIT, …), file names and author-year citations (Gunn (2026), Martin & Kok (2017)).
// They are wrapped in <span translate="no">; the HTML `translate` attribute is the standard way to mark text
// that should not be translated, and the "notranslate" class is the older Google form, so both are set.
// A single space on each side of a protected term is moved inside the span: a translator that splits the
// sentence around the term then cannot drop the space between a word and the term (in English the rendered
// text is unchanged, since spaces at element boundaries collapse to one).
import { escapeHtml } from "./format";

/** attributes of a protected element */
export const NO_TRANSLATE_ATTRS = 'translate="no" class="notranslate"';

/** Names kept as written (literal, case-sensitive, whole words); longer forms before shorter ones. */
export const NO_TRANSLATE_NAMES: readonly string[] = [
  // the atlas and the lab
  "Dune Atlas Earth", "Dune Atlas Mars", "Dune Atlas", "Monash Geomorphology Lab", "Monash University", "Monash",
  // wind datasets and models
  "ERA5-Land", "ERA5", "Copernicus Climate Change Service", "Copernicus DEM GLO-30", "Copernicus DEM", "Copernicus",
  "Mars Climate Modeling Center", "MCMC FV3",
  // basemap and data providers, products
  "OpenFreeMap", "OpenMapTiles", "OpenStreetMap", "OpenTopoMap", "OpenPlanetaryMap", "Positron", "Mapterhorn",
  "Esri World Imagery", "Esri Master License Agreement", "Esri OnMars", "Esri", "Maxar", "Earthstar Geographics", "GIS User Community", "CARTO",
  "Global Aridity Index and Potential Evapotranspiration (ET0) Database", "Global-AI_PET v3.1",
  "CSIRO Land and Water", "Mars Global Digital Dune Database", "USGS Astrogeology Science Center", "USGS Astrogeology",
  "Goddard Space Flight Center", "Global CTX Mosaic of Mars", "Mars HiRISE Image Mosaic", "Mars Reconnaissance Orbiter", "Murray Lab", "University of Arizona", "Viking MDIM 2.1",
  "HiRISE", "Natural Earth", "Supplementary Code", "Zenodo", "GitHub", "MapLibre", "KaTeX", "Zarr", "NetCDF",
  // journals
  "Nature Communications", "J. Fluid Mech.",
];

/** all-capital words that are ordinary words or compass points, not acronyms: left to the translator */
const NOT_ACRONYMS = new Set(["FROM", "TOWARD", "TOWARDS", "WITHOUT", "AND", "OR", "NOT", "NB",
  "NNE", "NE", "ENE", "ESE", "SE", "SSE", "SSW", "SW", "WSW", "WNW", "NW", "NNW"]);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** a name, with "&" also matching its escaped form "&amp;" (the matcher runs on escaped HTML text) */
const namePattern = (n: string) => esc(n).replace(/&/g, "(?:&|&amp;)");
const AND = "(?:&|&amp;)";
const SURNAME = "(?:Courrech du Pont|[A-Z][\\p{Ll}'’\\-]+(?: [A-Z][\\p{Ll}'’\\-]+)?)";
const YEAR = "\\d{4}[a-z]?";
const PATTERNS: string[] = [
  // licences
  "CC BY(?:-SA|-NC|-ND)*(?: \\d\\.\\d)?(?: IGO)?", "CC-BY(?:-SA|-NC|-ND)*(?: \\d\\.\\d)?", "CC0(?: \\d\\.\\d)?", "ODbL(?: \\d\\.\\d)?", "MIT",
  // author-year citations: "Gunn (2026)", "Martin & Kok (2017)", "Courrech du Pont et al. (2014)", "Hayward et al. 2007, 2010"
  `${SURNAME}(?: et al\\.| ${AND} ${SURNAME}| and ${SURNAME})?,? \\(${YEAR}(?:[,;] ${YEAR})*\\)`,
  `${SURNAME}(?: et al\\.| ${AND} ${SURNAME})(?:,? ${YEAR})(?:[,;] ${YEAR})*`,
  `${SURNAME} ${YEAR}(?=[,;)])`,
  // plain-text symbols of the atlas (the TeX forms are protected with the KaTeX output)
  "Q̂\\|⊥\\|/⊥,H", "Q̂\\|⊥\\|/∥,E", "Q̂∥/⊥,H", "σE/σH", "α[TEHO]", "u[*∗],th", "u[*∗]", "V²\\(V − Vt\\)",
  // file names
  "[\\w-]+\\.(?:csv|nc|json|txt|tif|png|svg|zarr|pmtiles|geojson|md|cff)",
  ...NO_TRANSLATE_NAMES.map(namePattern),
  // acronyms (two or more capitals / digits, e.g. DP, RDP/DP, FV3, MOLA–HRSC, NASA/JPL/MSSS), runs of them ("MCMC FV3")
  "[A-Z][A-Z0-9]*[A-Z0-9](?:[-/–][A-Z0-9]+)*(?: [A-Z][A-Z0-9]*[A-Z0-9](?:[-/–][A-Z0-9]+)*)*",
];
const TERMS = new RegExp(PATTERNS.map((p) => `(?:${p})`).join("|"), "gu");
const WORD = /[\p{L}\p{N}_]/u;

/** [start, end) ranges of the protected terms of `s` (whole words; not inside a hyphenated word such as
 *  "IAU-approved", which is translated as one word) */
export function termRanges(s: string): [number, number][] {
  const out: [number, number][] = [];
  TERMS.lastIndex = 0;
  for (let m = TERMS.exec(s); m; m = TERMS.exec(s)) {
    const i = m.index, j = i + m[0].length;
    if (!m[0]) { TERMS.lastIndex++; continue; }
    const before = s[i - 1] ?? "", after = s[j] ?? "";
    const okBefore = !WORD.test(before) && !(before === "-" && WORD.test(s[i - 2] ?? ""));
    const okAfter = !WORD.test(after) && !(after === "-" && WORD.test(s[j + 1] ?? ""));
    // all-capital words that are ordinary words (and plain all-capital runs made only of them)
    const plainCaps = /^[A-Z ]+$/.test(m[0]) && m[0].split(" ").every((w) => NOT_ACRONYMS.has(w));
    if (okBefore && okAfter && !plainCaps) { out.push([i, j]); continue; }
    TERMS.lastIndex = i + 1;
  }
  return out;
}

/** Escaped text (HTML-safe, no tags) -> the same with each protected term wrapped; spaces moved inside. */
export function protectEscaped(t: string): string {
  const r = termRanges(t);
  if (!r.length) return t;
  let out = "", last = 0;
  for (let [i, j] of r) {
    if (i > last && t[i - 1] === " ") i--;
    if (t[j] === " ") j++;
    out += t.slice(last, i) + `<span ${NO_TRANSLATE_ATTRS}>${t.slice(i, j)}</span>`;
    last = j;
  }
  return out + t.slice(last);
}

/** Plain text -> escaped HTML with the protected terms wrapped. */
export const protectText = (s: string | undefined | null): string => (s ? protectEscaped(escapeHtml(s)) : "");

/** Elements whose content is never processed: already protected, or where a <span> is not allowed. */
const SKIP_TAGS = new Set(["script", "style", "textarea", "option", "optgroup", "select", "title", "svg", "math", "pre", "code"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const isNoTranslate = (tag: string) => /\stranslate\s*=\s*["']?no\b/i.test(tag) || /\sclass\s*=\s*["'][^"']*\bnotranslate\b/i.test(tag);

/** HTML string -> the same with the protected terms of its text wrapped. Tags, attribute values and the
 *  content of protected (translate="no") or skipped elements are left unchanged, so the function can be
 *  applied again to its own output. */
export function protectHtml(html: string | undefined | null): string {
  if (!html) return "";
  let out = "", skip = 0;
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<[^>]*>|[^<]+|</g)) {
    const tok = m[0];
    if (tok.startsWith("<!--")) { out += tok; continue; }
    const tag = /^<(\/?)([a-zA-Z][\w:-]*)/.exec(tok);
    if (tag) {
      const name = tag[2].toLowerCase(), closing = tag[1] === "/";
      const selfClosing = VOID.has(name) || /\/\s*>$/.test(tok);
      if (closing) { if (skip > 0) skip--; }
      else if (!selfClosing) { if (skip > 0 || SKIP_TAGS.has(name) || isNoTranslate(tok)) skip++; }
      out += tok;
      continue;
    }
    out += skip > 0 ? tok : protectEscaped(tok);
  }
  return out;
}

/** HTML wrapped as a whole in a protected span (citations, reference lists, licence strings). */
export const noTranslateHtml = (html: string) => (html ? `<span ${NO_TRANSLATE_ATTRS}>${html}</span>` : "");

/** DOM: mark an element as not to be translated */
export function markNoTranslate<T extends Element>(el: T): T {
  el.setAttribute("translate", "no");
  el.classList.add("notranslate");
  return el;
}

/** DOM: text as nodes, with the protected terms in <span translate="no"> (for h() string children). */
export function protectedNodes(s: string): (Node | string)[] {
  const r = termRanges(s);
  if (!r.length) return [s];
  const out: (Node | string)[] = [];
  let last = 0;
  for (let [i, j] of r) {
    if (i > last && s[i - 1] === " ") i--;
    if (s[j] === " ") j++;
    if (i > last) out.push(s.slice(last, i));
    const span = document.createElement("span");
    span.textContent = s.slice(i, j);
    out.push(markNoTranslate(span));
    last = j;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** elements whose text is left as it is by protectDom (already protected, or no <span> allowed) */
const SKIP_SELECTOR = '[translate="no"], .notranslate, svg, math, option, optgroup, select, textarea, script, style, title, pre, code';
/** DOM: protect the terms of every text node under `root` (for panels built from HTML strings, e.g. the cell
 *  panel). Text already inside a protected element is skipped, so this can run after every update. */
export function protectDom(root: Element | null | undefined): void {
  if (!root) return;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text, p = t.parentElement;
    if (!p || p.closest(SKIP_SELECTOR) || !termRanges(t.data).length) continue;
    nodes.push(t);
  }
  for (const t of nodes) t.replaceWith(...protectedNodes(t.data));
}
