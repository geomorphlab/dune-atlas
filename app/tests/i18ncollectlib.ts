// Collects every rendered text unit of an atlas (i18n/dom.ts) in English: all panels of tests/publictext.ts
// (layer panel with every popover, About, cell panel) plus the tool panels (help, Concepts, share, export).
// npm run i18n writes the result to src/i18n/collected-<body>.json, which scripts/i18n.ts adds to the
// reviewer files.
import { vi } from "vitest";

export async function collectRendered(body: "earth" | "mars"): Promise<{ en: string; area: string }[]> {
  vi.resetModules();
  (globalThis as { __I18N_COLLECT__?: boolean }).__I18N_COLLECT__ = true;
  history.replaceState(null, "", "/");
  const i18n = await import("../src/i18n");
  const { translateDom } = await import("../src/i18n/dom");
  const obs = new MutationObserver((recs) => {
    for (const r of recs) {
      r.addedNodes.forEach((n) => { if (n.nodeType === 1) translateDom(n as Element); });
      const t = r.target.nodeType === 1 ? (r.target as Element) : r.target.parentElement;
      if (t) translateDom(t);
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  // module paths as values: each atlas's collector type-checks only in its own build (tsconfig / tsconfig.mars)
  const mod = body === "mars" ? "./mars/publictext" : "./publictext";
  const m = await import(/* @vite-ignore */ mod);
  await (body === "mars" ? m.collectMarsPublicText() : m.collectPublicText());
  await flush();
  // tool panels
  document.body.innerHTML = "";
  const { Tools } = await import("../src/core/ui/tools");
  const tools = new Tools({ startTour: () => {}, shareLink: () => "https://map.geomorphlab.org/", exportMap: async () => {}, openAbout: () => {} } as never);
  document.body.append(tools.el);
  for (const open of [() => tools.openHelp(), () => tools.openConcepts(), () => tools.openShare(), () => tools.openExport()]) {
    try { open(); } catch { /* a panel needing more context */ }
    await flush(); translateDom(document.body); tools.close();
  }
  await flush();
  // texts shown later on demand (search, region download, messages): their strings as units
  const NUM = /(?<![\p{L}\p{N}_.,])[-−]?\d+(?:[.,]\d+)*(?![\p{L}\p{N}_])/gu;
  const unit = (v: string, area: string) => { let k = 0; const t = v.replace(/\s+/g, " ").trim().replace(NUM, () => `⟦#${k++}⟧`); if (/\p{L}{2,}/u.test(t) && !i18n.COLLECTED.has(t)) i18n.COLLECTED.set(t, area); };
  const strings = (o: unknown, area: string) => { for (const v of Object.values(o as Record<string, unknown>)) if (typeof v === "string") unit(v, area); };
  strings((await import("../src/core/ui/search")).SEARCH_TEXT, "Search and messages");
  strings((await import("../src/core/ui/regionExport")).REGION_TEXT, "Search and messages");
  strings((await import("../src/core/search/places")).PLACE_TEXT, "Search and messages");
  strings((await import("../src/core/export/mapExport")).EXPORT_STAGES, "Search and messages");
  const ht = await import("../src/core/ui/helpText");
  strings(ht.EXPORT_TEXT, "Tool panels"); strings(ht.SHARE_TEXT, "Tool panels"); strings(ht.TOUR_FALLBACK, "Search and messages");
  unit((await import("../src/core/ui/loading")).LOADING_TEXT, "Search and messages");
  // the search box (placeholder with and without place names, the coordinate note, the results list label), as the
  // attribute and text templates the page builds from them (i18n varTemplate: numbers and compass letters as ⟦#n⟧)
  const { PROFILE } = await import("@body/profile");
  const attr = (v: string, area: string) => { const t = i18n.varTemplate(v.replace(/\s+/g, " ").trim(), "en").tpl; if (/\p{L}{2,}/u.test(t) && !i18n.COLLECTED.has(t)) i18n.COLLECTED.set(t, area); };
  attr(`Place or ${PROFILE.search.example}`, "Screen-reader labels and tooltips");
  attr(PROFILE.search.example, "Screen-reader labels and tooltips");
  attr("Places", "Screen-reader labels and tooltips");
  if (PROFILE.search.conventionNote) attr(PROFILE.search.conventionNote, "Search and messages");
  obs.disconnect();
  (globalThis as { __I18N_COLLECT__?: boolean }).__I18N_COLLECT__ = false;
  // every rendered unit is kept, also those whose words match a keyed string (help, tour, layer names): the page
  // looks a unit up by its own English, so a dropped unit stays in English (e.g. the label "Wind dataset ⟦0⟧");
  // scripts/i18n.ts fills a new unit whose English equals a translated string with that translation
  return [...i18n.COLLECTED].map(([en, area]) => ({ en, area }));
}
