// Shared by tests/notranslate.test.ts and tests/mars/notranslate.test.ts: the markup that keeps page
// translators (Chrome / Google Translate, Edge / Microsoft Translator, Safari) away from symbols, acronyms,
// names, licences and references (src/core/util/notranslate.ts).
import { expect } from "vitest";
import { termRanges } from "../src/core/util/notranslate";

const SKIP = '[translate="no"], .notranslate, svg, math, option, optgroup, select, textarea, script, style, title, pre, code';

/** text nodes under `root` that still contain a term a translator would change (should be none) */
export function unprotected(root: Element): string[] {
  const out: string[] = [];
  const w = document.createTreeWalker(root, 4);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n as Text;
    if (t.parentElement?.closest(SKIP)) continue;
    for (const [i, j] of termRanges(t.data)) out.push(`${t.data.slice(i, j)} | ${t.data.trim().slice(0, 80)}`);
  }
  return out;
}

/** every ⓘ button, KaTeX formula and reference list under `root` is marked translate="no" */
export function checkMarked(root: Element) {
  const info = [...root.querySelectorAll(".info-button")];
  expect(info.length).toBeGreaterThan(0);
  for (const b of info) { expect(b.getAttribute("translate")).toBe("no"); expect(b.getAttribute("aria-label")).toMatch(/^About /); }
  const tex = [...root.querySelectorAll(".katex, .tex-fallback")];
  expect(tex.length).toBeGreaterThan(0);
  for (const k of tex) expect(k.getAttribute("translate")).toBe("no");
  for (const l of root.querySelectorAll(".concept-reflist, .cite-list li li > span")) expect(l.closest('[translate="no"]')).not.toBeNull();
}
