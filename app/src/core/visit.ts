// What the atlas remembers in the browser. One rule: a new visit opens exactly like a first visit (the body
// profile's default view, its dataset and the default panel layout), on both atlases.
//   Kept between visits (localStorage): the language (i18n/index.ts) and whether the tour was seen (ui/tour.ts).
//   Kept for the visit only (sessionStorage of the tab, shared by the two atlases on one origin, so it survives a
//   reload and the planet button and is gone in a new tab or window): the wind dataset, 'Show names', the plotted
//   quantity, the petal direction, the open / closed panel sections and groups, the cell-panel size and the last
//   view of each atlas (the planet button's return, defaultview.ts resumeQuery).
// Panel layout keys are shared by the two atlases (the same interface); dataset, names, plotted quantity and last
// view are per atlas (body.ts storageKey).
import { storageKeyFor } from "./body";

/** visit key shared by both atlases (the Earth form, duneAtlas.<name>) */
export const sharedKey = (name: string) => storageKeyFor("earth", name);

export function visitGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
export function visitSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* private mode / no storage */ }
}
/** a JSON object of booleans (open state per group id); {} when absent or unreadable */
export function visitFlags(key: string): Record<string, boolean> {
  try {
    const o = JSON.parse(visitGet(key) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean>;
  } catch { return {}; }
}

/** names of settings earlier versions kept in localStorage, for either atlas; removed once on load so that nothing
 *  left from an earlier visit (or from local testing) can come back */
export const RETIRED_LOCAL_NAMES = [
  "dataset", "names", "lastView", "cellPanel.plotY", "fluxRosePetals", "cellPanel.tableGroups", "cellPanel.width", "cellPanel.height",
  ...["windRose", "fluxRose", "modes", "qsdiv", "summary", "downloads"].map((k) => `cellPanel.${k}Open`),
];
export function dropRetiredLocal(): void {
  try {
    for (const b of ["earth", "mars"] as const) for (const n of RETIRED_LOCAL_NAMES) localStorage.removeItem(storageKeyFor(b, n));
  } catch { /* no storage */ }
}
