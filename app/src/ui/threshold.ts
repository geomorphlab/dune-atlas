// The single global u*,th control (64 steps). The full version is pinned at the top of the
// layer panel; a compact copy sits at the top of the cell panel. Both write/read the same store
// key, so map layers, roses, modes plot and table all follow either one.
import type { ThresholdDef } from "../registry/types";
import type { Store } from "../store";
import { h } from "./dom";
import { mathHtml } from "../util/math";
import { padFigure, reserveCh } from "./livenum";

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
  // readout: padded to the widest value with figure spaces, in a fixed-width tabular slot (ui/livenum.ts)
  const outChars = Math.max(...t.values.map((v) => [...formatUt(v)].length));
  const out = h("output", { for: sid, id: vid, class: "ut-value live-num", style: `min-width:${reserveCh(t.values.map(formatUt))}ch` });
  const sync = (i: number) => {
    if (input.value !== String(i)) input.value = String(i);
    out.textContent = padFigure(formatUt(t.values[i]), outChars);
    input.setAttribute("aria-valuetext", `${formatUt(t.values[i])}`);
  };
  sync(store.state.utIndex);
  input.addEventListener("input", () => store.set({ utIndex: Number(input.value) }));
  store.subscribe((s, ch) => { if (ch.has("utIndex")) sync(s.utIndex); });
  const reset = h("button", { type: "button", class: "link-button", title: `Reset to the default ${formatUt(t.values[t.defaultIndex])}` }, `default ${formatUt(t.values[t.defaultIndex])}`);
  reset.addEventListener("click", () => store.set({ utIndex: t.defaultIndex }));
  const pct = (100 * t.defaultIndex) / (t.values.length - 1);
  const track = h("div", { class: "ut-track" }, input, ticks, h("span", { class: "ut-default-mark", style: `left: calc(${pct}% + ${(0.5 - pct / 100) * 16}px)`, title: `default ${formatUt(t.values[t.defaultIndex])}`, "aria-hidden": "true" }));
  const label = h("label", { for: sid, class: "ut-label", html: opts.compact ? mathHtml("$u_{*,th}$") : `Threshold friction velocity ${mathHtml("$u_{*,th}$")}` });
  const sec = h("section", { class: `threshold${opts.compact ? " compact" : ""}`, "aria-label": "Threshold friction velocity" },
    /* children below */);
  if (opts.compact) { // cell panel: one line (label, value, default) above the slider
    sec.append(h("div", { class: "threshold-head" }, label, out, reset), track);
    return sec;
  }
  // layer panel, identical structure in both builds: label line (with ⓘ) | value + default |
  // slider | one short description line; the details are in the ⓘ popover (and Help)
  const popId = `${p}ut-info`;
  const info = h("button", { type: "button", class: "info-button", "aria-expanded": "false", "aria-controls": popId, "aria-label": "About this control" }, "i") as HTMLButtonElement;
  const pop = h("div", { id: popId, class: "info-popover", hidden: true, role: "note", html: thresholdInfoHtml(t) });
  info.addEventListener("click", () => {
    const open = info.getAttribute("aria-expanded") !== "true";
    info.setAttribute("aria-expanded", String(open));
    pop.hidden = !open;
  });
  sec.append(
    h("div", { class: "threshold-head" }, label, info),
    h("div", { class: "threshold-readout" }, out, reset),
    track,
    h("p", { id: hid, class: "help", html: THRESHOLD_HELP }),
    pop);
  return sec;
}

/** the one description line under the slider (same in both builds; details in the ⓘ) */
export const THRESHOLD_HELP = "Applies to the map layers and the cell panel.";
/** the slider's ⓘ, middle paragraphs: the default and its equivalents */
export const THRESHOLD_INFO_DEFAULT = `<p>The default, 0.15 m/s, is the value used for the global analysis of Gunn (2026): a common global approximation used in place of more accurate local values, not calibrated for any site. Values between 0.1 and 0.4 m/s are typical; for loose, dry sand the threshold depends mainly on grain size and density.</p>`
  + `<p>With the roughness length of 1 mm used here, 0.15 m/s corresponds to a 10 m wind of 3.4 m/s (6.6 knots); the 12-knot threshold of Fryberger &amp; Dean (1979) corresponds to about 0.27 m/s.</p>`;   // the Baas (2026) point is in the Wind dataset ⓘ
/** the slider's ⓘ: what the control is, its default, its range */
export function thresholdInfoHtml(t: ThresholdDef): string {
  return `<p>The friction velocity ${mathHtml("$u_{*,th}$")} above which the wind moves sand. Every threshold-dependent map layer (its ⓘ says so) and the cell panel use the value set here.</p>`
    + THRESHOLD_INFO_DEFAULT
    + `<p>${t.values.length} values from ${formatUt(t.values[0])} to ${formatUt(t.values[t.values.length - 1])}; default ${formatUt(t.values[t.defaultIndex])} (the mark under the slider). The compact copy at the top of the cell panel sets the same value.</p>`;
}
