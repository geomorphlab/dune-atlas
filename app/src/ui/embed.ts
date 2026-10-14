// Embed mode (?embed=1, the Google Sites iframe): an "Open full screen ↗" pill on the map, top left,
// above the layer panel (round 7). Same in both atlases; the link opens the current view in a new tab.
import type { Store } from "../store";
import { h } from "./dom";

export const FULL_SCREEN_TEXT = "Open full screen ↗";
export const FULL_SCREEN_NOTE = "Best viewed full screen";

export function embedBar(url: () => string, store: Store): HTMLElement {
  const a = h("a", { class: "fullscreen-pill", href: url(), target: "_blank", rel: "noopener", title: `${FULL_SCREEN_NOTE}: opens this view in a new tab` }, FULL_SCREEN_TEXT);
  store.subscribe(() => { a.href = url(); });
  return h("div", { class: "embed-bar" }, a, h("span", { class: "embed-note" }, FULL_SCREEN_NOTE));
}
