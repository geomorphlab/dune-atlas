// Shared by tests/jitter.test.ts and tests/mars/jitter.test.ts (slider-jitter sweep, PI round 5 item 2).
import type { Store } from "../src/store";
import { measuredWidthCh, type Measure } from "../src/ui/livenum";

/** a cell whose fields span 11 decades, change sign and go undefined, so every format width is exercised */
export function sweepFields(nVars: number, n = 64): Float32Array {
  const f = new Float32Array(nVars * n);
  for (let i = 0; i < nVars; i++) for (let k = 0; k < n; k++) f[i * n + k] = (k % 17 === 5 ? NaN : 10 ** (-9 + (11 * k) / (n - 1)) * (i % 2 ? -1 : 1) + (i % 5) * 0.37 * k);
  return f;
}
/** layout signature of a panel: text + element structure with every live slot reduced to its width */
export function signature(root: Element): { sig: string; overflow: string[] } {
  const c = root.cloneNode(true) as Element;
  c.querySelectorAll("svg, title, desc").forEach((e) => e.remove());
  const overflow: string[] = [];
  c.querySelectorAll(".live-num").forEach((e) => {
    const w = parseFloat((e as HTMLElement).style.minWidth);
    const t = e.tagName === "OUTPUT" ? e.textContent ?? "" : e.innerHTML;
    const bold = !!e.closest("strong, b, h2") || e.tagName === "OUTPUT";
    if (!(measuredWidthCh(t, bold) <= w)) overflow.push(`${t} > ${w}ch`);
    e.replaceWith(`[slot ${w}ch${e.tagName === "OUTPUT" ? ` ${[...(e.textContent ?? "")].length} chars` : ""}]`);
  });
  const walk = (e: Element): string => `<${e.tagName}${e.getAttribute("class") ? `.${e.getAttribute("class")}` : ""}>${[...e.childNodes].map((n) => (n.nodeType === 3 ? (n.textContent ?? "").replace(/\s+/g, " ") : n.nodeType === 1 ? walk(n as Element) : "")).join("")}`;
  return { sig: walk(c), overflow };
}

export async function sweep(store: Store, roots: Element[], n: number): Promise<{ sigs: Set<string>; overflow: string[]; slots: number }> {
  const sigs = new Set<string>(); const overflow: string[] = [];
  let slots = 0;
  for (let k = 0; k < n; k++) {
    store.set({ utIndex: k });
    await new Promise((r) => setTimeout(r, 0));
    const s = roots.map(signature);
    sigs.add(s.map((x) => x.sig).join("\n"));
    overflow.push(...s.flatMap((x) => x.overflow.map((o) => `k=${k}: ${o}`)));
    slots = roots.reduce((a, r) => a + r.querySelectorAll(".live-num").length, 0);
  }
  return { sigs, overflow, slots };
}


/** A stand-in for canvas measureText (happy-dom has no canvas): proportional advances (em) of a sans-serif
 *  UI font, bold 6 % wider; digits all 0.55 em (tabular). Used to check the measured slot widths. */
export const fakeMeasure: Measure = (text, font) => {
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16), bold = /^700/.test(font);
  const adv = (c: string) => /[0-9\u2007]/.test(c) ? 0.55 : /[ \u00a0]/.test(c) ? 0.28 : /[mwMW%—]/.test(c) ? 0.85 : /[ijlft.,:;'!|()[\]/]/.test(c) ? 0.3
    : /[A-Z]/.test(c) ? 0.68 : 0.52;
  return [...text].reduce((a, c) => a + adv(c), 0) * px * (bold ? 1.06 : 1);
};

/** Live slots whose reserved room could show as a hole: every slot must end its line block (cell-meta line,
 *  legend item, caption lead, heading) or be a right-aligned table value or a padded readout. */
export function holes(roots: Element[]): string[] {
  const out: string[] = [];
  for (const root of roots) for (const e of root.querySelectorAll(".live-num")) {
    if (e.tagName === "OUTPUT" || e.closest("td.num")) continue;
    const block = e.closest("dd, li, .cap-lead, .meta-line, h3, p");
    const tail = (block?.textContent ?? "").replace(/\s+$/, "");
    if (!block || !e.classList.contains("left") || !tail.endsWith((e.textContent ?? "").replace(/\s+$/, ""))) out.push(`${block?.tagName ?? "?"}: ${(block?.textContent ?? "").slice(0, 80)}`);
  }
  return out;
}
