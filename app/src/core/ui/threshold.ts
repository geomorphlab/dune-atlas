// The single global slider control (64 steps; Earth: threshold friction velocity u*,th, Mars: median
// grain diameter d - the quantity's wording is the body profile's). The full version is pinned at the
// top of the layer panel; a compact copy sits at the top of the cell panel. Both write/read the same
// store key, so map layers, roses, modes plot and table all follow either one.
import type { ThresholdDef } from "../registry/types";
import { conceptLinkHtml } from "./concepts";
import type { Store } from "../store";
import { h } from "./dom";
import { mathHtml } from "../util/math";
import { padFigure, reserveCh } from "./livenum";
import { PROFILE } from "@body/profile";

export function formatUt(v: number): string {
  return PROFILE.control.format(v);
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
  // the registry label without its trailing symbol ("Threshold friction velocity u*,th" -> "Threshold friction velocity")
  const name = t.label.replace(/\s+\S+$/, "");
  const sym = mathHtml(PROFILE.control.symbolTex);
  const label = h("label", { for: sid, class: "ut-label", html: opts.compact ? sym : `${name} ${sym}` });
  const sec = h("section", { class: `threshold${opts.compact ? " compact" : ""}`, "aria-label": name },
    /* children below */);
  if (opts.compact) { // cell panel: one line (label, value, default) above the slider
    sec.append(h("div", { class: "threshold-head" }, label, out, reset), track);
    return sec;
  }
  // layer panel, identical structure in both builds: label line (with ⓘ) | value + default |
  // slider | one short description line; the details are in the ⓘ popover (and Help)
  const popId = `${p}ut-info`;
  const info = h("button", { type: "button", class: "info-button notranslate", translate: "no", "aria-expanded": "false", "aria-controls": popId, "aria-label": "About this control" }, "i") as HTMLButtonElement;
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
/** the slider's ⓘ: what the control is, its default, its range */
export function thresholdInfoHtml(t: ThresholdDef): string {
  return PROFILE.control.infoIntroHtml()
    + `<p>${t.values.length} ${PROFILE.control.rangeAdjective}values from ${formatUt(t.values[0])} to ${formatUt(t.values[t.values.length - 1])}; default ${formatUt(t.values[t.defaultIndex])} (the mark under the slider). The compact copy at the top of the cell panel sets the same value.</p>`
    + conceptLinkHtml("@threshold");
}
