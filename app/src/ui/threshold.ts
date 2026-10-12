// The single global u*,th control (64 steps). The full version is pinned at the top of the
// layer panel; a compact copy sits at the top of the cell panel. Both write/read the same store
// key, so map layers, roses, modes plot and table all follow either one.
import type { ThresholdDef } from "../registry/types";
import type { Store } from "../store";
import { h } from "./dom";
import { mathHtml } from "../util/math";

export function formatUt(v: number): string {
  return `${v.toFixed(2)} m/s`;
}

export function thresholdControl(t: ThresholdDef, store: Store, opts: { compact?: boolean; idPrefix?: string } = {}): HTMLElement {
  const p = opts.idPrefix ?? "";
  const sid = `${p}ut-slider`, vid = `${p}ut-value`, lid = `${p}ut-ticks`, hid = `${p}ut-help`;
  const input = h("input", {
    type: "range", id: sid, min: 0, max: t.values.length - 1, step: 1, value: store.state.utIndex,
    list: lid, "aria-describedby": opts.compact ? undefined : hid,
  }) as HTMLInputElement;
  const ticks = h("datalist", { id: lid }, h("option", { value: t.defaultIndex, label: `default ${formatUt(t.values[t.defaultIndex])}` }));
  const out = h("output", { for: sid, id: vid, class: "ut-value" });
  const sync = (i: number) => {
    if (input.value !== String(i)) input.value = String(i);
    out.textContent = formatUt(t.values[i]);
    input.setAttribute("aria-valuetext", `${formatUt(t.values[i])}`);
  };
  sync(store.state.utIndex);
  input.addEventListener("input", () => store.set({ utIndex: Number(input.value) }));
  store.subscribe((s, ch) => { if (ch.has("utIndex")) sync(s.utIndex); });
  const reset = h("button", { type: "button", class: "link-button", title: `Reset to the default ${formatUt(t.values[t.defaultIndex])}` }, `default ${t.values[t.defaultIndex].toFixed(2)}`);
  reset.addEventListener("click", () => store.set({ utIndex: t.defaultIndex }));
  const pct = (100 * t.defaultIndex) / (t.values.length - 1);
  const track = h("div", { class: "ut-track" }, input, ticks, h("span", { class: "ut-default-mark", style: `left: calc(${pct}% + ${(0.5 - pct / 100) * 16}px)`, title: `default ${formatUt(t.values[t.defaultIndex])}`, "aria-hidden": "true" }));
  const label = h("label", { for: sid, class: "ut-label", html: opts.compact ? mathHtml("$u_{*,th}$") : `Threshold friction velocity ${mathHtml("$u_{*,th}$")}` });
  const sec = h("section", { class: `threshold${opts.compact ? " compact" : ""}`, "aria-label": "Threshold friction velocity" },
    h("div", { class: "threshold-head" }, label, out, reset),
    track);
  if (!opts.compact) {
    sec.append(h("p", { id: hid, class: "help", html: `Drives every threshold-dependent map layer and the cell panel (${formatUt(t.values[0])}–${formatUt(t.values[t.values.length - 1])}; default ${formatUt(t.values[t.defaultIndex])}).` }));
  }
  return sec;
}
