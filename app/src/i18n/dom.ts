// Translation of rendered text (popovers, About, cell panel, menus, tooltips): every element that holds text
// directly is one unit. Its content is turned into a template in which formulas (KaTeX), protected terms
// (translate="no"), live numbers (.live-num), form controls, nested blocks and plain numbers are numbered
// placeholders ⟦0⟧, ⟦1⟧ …; the template's translation (looked up by the template's own fingerprint, so an
// edited English never shows a stale translation) is put back with the original nodes and numbers in the
// placeholders. Kept nodes are moved, not recreated, so references and listeners on them survive; only plain
// inline markup (links, bold, line breaks) is rebuilt. Attributes title, aria-label, placeholder and alt are
// translated whole. A MutationObserver applies this to everything the atlas adds or changes.
import { COLLECTED, LANG, trIn, contentKey, varTemplate, fillVars } from "./index";

/** nodes kept as they are inside a unit (placeholders) */
const KEEP_SEL = '.katex, .tex-fallback, [translate="no"], .notranslate, .live-num, input, select, textarea, button, svg, img, canvas, code, pre, output, kbd';
/** subtrees never translated */
const SKIP_SEL = '[translate="no"], .notranslate, script, style, code, pre, .maplibregl-canvas-container, .maplibregl-ctrl-attrib, [data-i18n-skip]';
/** regions whose text is translated by key (i18n/catalogue.ts): not collected again as rendered text */
const KEYED_SEL = '[data-help], .concept-link, #tour-title, #tour-body, .tour-count, details.concept > summary, .concept-body > p, .fry-fig, .layer-group > summary, .layer-group > p.help, .layer-row > label, .order-title, .legend-note, .legend-units, .legend-vec, .basemaps label, .basemaps legend, .atlas-header .subtitle, .panel-toggle, .order > summary, .dunes-only-row, .display-opts > summary, .spacing-end, .lang-switch, .atlas-lang, .tour-bubble, .basemap-notice';
/** inline markup kept inside a unit (rebuilt from the translation) */
const INLINE = new Set(["A", "STRONG", "EM", "B", "I", "SUB", "SUP", "BR", "SPAN", "SMALL", "ABBR", "Q", "U", "MARK"]);
const ATTRS = ["title", "aria-label", "placeholder", "alt"];
const AREA_OF: [string, string][] = [
  [".info-popover", "Layer popovers"], ["details.about", "About"], ["#cell-panel", "Cell panel"],
  [".tool-pop", "Tool panels"], [".tour", "Guided tour"], ["#layer-panel", "Layer panel"],
];
const collecting = () => !!(globalThis as { __I18N_COLLECT__?: boolean }).__I18N_COLLECT__;
const active = () => LANG !== "en" || collecting();

const isKeep = (n: Node): boolean => n.nodeType === 1 && ((n as Element).matches(KEEP_SEL) || !INLINE.has((n as Element).tagName));

/** template of a unit: its HTML with kept nodes and numbers as placeholders */
export function unitTemplate(el: Element): { template: string; kept: Node[]; nums: string[]; local: boolean } {
  const kept: Node[] = [], nums: string[] = [];
  let local = false;
  const ser = (n: Node): string => {
    if (n.nodeType === 3) {   // numbers and compass points: placeholders numbered across the whole unit
      const v = varTemplate(escapeText(n.nodeValue ?? ""));
      if (v.local) local = true;
      return v.tpl.replace(/⟦#(\d+)⟧/g, (_m, i) => { nums.push(v.nums[Number(i)]); return `⟦#${nums.length - 1}⟧`; });
    }
    if (n.nodeType !== 1) return "";
    const e = n as Element;
    if (isKeep(e)) { kept.push(e); return `⟦${kept.length - 1}⟧`; }
    const attrs = [...e.attributes].filter((a) => a.name === "href" || a.name === "target" || a.name === "rel" || a.name === "class").map((a) => ` ${a.name}="${a.value.replace(/"/g, "&quot;")}"`).join("");
    if (e.tagName === "BR") return "<br>";
    return `<${e.tagName.toLowerCase()}${attrs}>${[...e.childNodes].map(ser).join("")}</${e.tagName.toLowerCase()}>`;
  };
  const t = [...el.childNodes].map(ser).join("").replace(/\s+/g, " ").trim();
  return { template: t, kept, nums, local };
}
const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hasWords = (t: string) => /\p{L}{2,}/u.test(t.replace(/⟦#?\d+⟧|<[^>]+>|&\w+;/g, " "));

function areaOf(el: Element): string {
  for (const [sel, a] of AREA_OF) if (el.closest(sel)) return a;
  return el.closest("[aria-label], [title]") && !el.textContent?.trim() ? "Screen-reader labels and tooltips" : "Other interface";
}

/** translate one unit in place (its children are rebuilt, the element itself is kept) */
function translateUnit(el: Element) {
  const { template, kept, nums, local } = unitTemplate(el);
  const words = hasWords(template);
  if (!words && !local) return;
  if (collecting()) { if (words && !COLLECTED.has(template) && !el.closest(KEYED_SEL)) COLLECTED.set(template, areaOf(el)); return; }
  const out = words ? trIn(LANG, contentKey(template), template) : template;
  if (out === template && !local) return;   // a compass point alone ("292° (WNW)") is still given its local name
  const html = fillVars(out, nums).replace(/⟦(\d+)⟧/g, (_m, i) => `<i data-i18n-slot="${i}"></i>`);
  const tpl = el.ownerDocument.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("[data-i18n-slot]").forEach((s) => { const n = kept[Number(s.getAttribute("data-i18n-slot"))]; if (n) s.replaceWith(n); else s.remove(); });
  el.replaceChildren(tpl.content);
}

function translateAttrs(el: Element) {
  if (el.getAttribute("data-i18n-attrs") === "no") return;   // labels already built from translated templates
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !hasWords(v)) continue;
    const { tpl: tplt, nums, local } = varTemplate(v.replace(/\s+/g, " ").trim());
    if (collecting()) { if (!COLLECTED.has(tplt)) COLLECTED.set(tplt, "Screen-reader labels and tooltips"); continue; }
    const out = trIn(LANG, contentKey(tplt), tplt);
    if (out !== tplt || local) el.setAttribute(a, fillVars(out, nums));
  }
}

/** does the element hold text itself (a non-blank text node among its children)? */
const holdsText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && /\S/.test(n.nodeValue ?? ""));

/** translate every unit and attribute under root */
export function translateDom(root: Element) {
  if (!active()) return;
  const walk = (el: Element) => {
    if (el.matches(SKIP_SEL)) return;
    translateAttrs(el);
    if (holdsText(el) && !isInlineOnly(el)) {
      translateUnit(el);
      // kept nested blocks and buttons inside a unit are units of their own
      el.querySelectorAll(":scope > *").forEach((c) => { if (isKeep(c)) walk(c); });
      return;
    }
    for (const c of [...el.children]) walk(c);
  };
  walk(root);
}
/** an inline element inside a text-holding parent is part of the parent's unit */
const isInlineOnly = (el: Element) => INLINE.has(el.tagName) && !!el.parentElement && holdsText(el.parentElement) && !el.matches(KEEP_SEL);

let observer: MutationObserver | null = null;
/** translate the page now and everything added or changed later (no-op in English) */
export function startDomTranslation(doc: Document = document) {
  if (LANG === "en" || observer) return;
  translateDom(doc.body);
  let pending = new Set<Element>();
  observer = new MutationObserver((recs) => {
    for (const r of recs) {
      const t = r.target.nodeType === 1 ? (r.target as Element) : r.target.parentElement;
      if (!t) continue;
      pending.add(r.type === "attributes" ? t : t.parentElement ?? t);
    }
    const todo = pending; pending = new Set();
    for (const el of todo) if (el.isConnected) translateDom(el);
  });
  observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
