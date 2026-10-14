// Shared by tests/jitter.test.ts and tests/mars/jitter.test.ts (slider-jitter sweep, PI round 5 item 2).
import type { Store } from "../src/store";
import { textWidthCh } from "../src/ui/livenum";

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
    if (!(textWidthCh(t) <= w)) overflow.push(`${t} > ${w}ch`);
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

