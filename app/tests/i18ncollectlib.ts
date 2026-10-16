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
  obs.disconnect();
  (globalThis as { __I18N_COLLECT__?: boolean }).__I18N_COLLECT__ = false;
  // drop units that are the English of a keyed translation (help, tour, layer names …: translated by key)
  const { catalogue } = await import("../src/i18n/catalogue");
  const words = (s: string) => new Set(s.replace(/\$[^$]*\$|⟦#?\d+⟧|<[^>]+>|&\w+;/g, " ").toLowerCase().match(/\p{L}{3,}/gu) ?? []);
  const keyed = catalogue().map((c) => words(c.en));
  const near = (w: Set<string>) => keyed.some((k) => { if (!w.size) return true; let n = 0; for (const x of w) if (k.has(x)) n++; return n === w.size && n === k.size; });
  // a unit with a compass placeholder ("αE (elongation direction): ⟦#0⟧° (⟦#1⟧)") is more than the keyed label
  const compass = (en: string) => /°\s?\(⟦#\d+⟧\)/.test(en);
  return [...i18n.COLLECTED].filter(([en]) => compass(en) || !near(words(en))).map(([en, area]) => ({ en, area }));
}
