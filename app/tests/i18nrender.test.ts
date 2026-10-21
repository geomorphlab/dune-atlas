// @vitest-environment happy-dom
// The atlas rendered in French and Chinese: layer panel (groups, layer names, legends, basemaps), help and
// tour in the language, formulas kept, page language set. The language is read from the address when
// i18n/index.ts loads, so each case sets the address and imports the modules afresh.
import { describe, expect, it, vi } from "vitest";

async function render(lang: string) {
  vi.resetModules();
  history.replaceState(null, "", `/?lang=${lang}`);
  document.body.innerHTML = '<aside id="layer-panel"></aside>';
  const i18n = await import("../src/i18n");
  const { loadRegistry } = await import("../src/core/registry/load");
  const { Store } = await import("../src/core/store");
  const { renderLayerPanel } = await import("../src/core/ui/layerPanel");
  const { DEFAULT_VIEW } = await import("../src/core/defaultview");
  const reg = loadRegistry().registry;
  const dp = reg.layers.find((l) => l.id === "dpm")!;
  renderLayerPanel(document.getElementById("layer-panel")!, reg, new Store({ basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: { dpm: { visible: true, opacity: 1 } }, order: [dp.id], dataset: DEFAULT_VIEW.dataset, cell: null, embed: false } as never));
  i18n.applyHtmlLang();
  return { i18n, panel: document.getElementById("layer-panel")!.textContent ?? "" };
}

describe("rendered in another language", () => {
  it("French: groups, active layers, basemaps in French; formulas kept; page lang fr", async () => {
    const { i18n, panel } = await render("fr");
    expect(i18n.LANG).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    for (const s of ["Calques actifs", "Potentiel de dérive", "Fond de carte", "Champs de dunes"]) expect(panel).toContain(s);
    expect(document.querySelector(".order > summary")?.textContent).toBe("Calques actifs");
  });
  it("Chinese: groups, active layers, basemaps in Chinese; page lang zh-Hans", async () => {
    const { i18n, panel } = await render("zh-Hans");
    expect(i18n.LANG).toBe("zh-Hans");
    expect(document.documentElement.lang).toBe("zh-Hans");
    for (const s of ["当前图层", "输沙势", "底图", "沙丘区"]) expect(panel).toContain(s);
  });
  it("French: popovers, About and the dunes-only switch translated on the page (observer)", async () => {
    vi.resetModules();
    history.replaceState(null, "", "/?lang=fr");
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const { startDomTranslation } = await import("../src/i18n/dom");
    startDomTranslation();
    const { loadRegistry } = await import("../src/core/registry/load");
    const { Store } = await import("../src/core/store");
    const { renderLayerPanel } = await import("../src/core/ui/layerPanel");
    const { DEFAULT_VIEW } = await import("../src/core/defaultview");
    const reg = loadRegistry().registry;
    renderLayerPanel(document.getElementById("layer-panel")!, reg, new Store({ basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: {}, order: [], dataset: DEFAULT_VIEW.dataset, cell: null, embed: false } as never));
    await new Promise((r) => setTimeout(r, 0));
    const about = document.querySelector("details.about")!.textContent ?? "";
    expect(about).toContain("Sources des données");
    const dp = document.querySelector('[data-layer="dpm"] .info-popover')?.textContent ?? "";
    expect(dp.length).toBeGreaterThan(50);
    expect(dp).not.toMatch(/\bthe saturated sand flux\b/i);
    expect(document.querySelector(".dunes-only-row")!.textContent).toContain("Dunes seules");
  });
});
