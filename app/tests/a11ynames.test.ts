// @vitest-environment happy-dom
// Every checkbox in the layer panel has an accessible name (review L16: KaTeX-only labels were read as "on").
import { describe, expect, it, vi } from "vitest";
import { renderLayerPanel } from "../src/ui/layerPanel";
import { loadRegistry } from "../src/registry/load";
import { Store, type AppState } from "../src/store";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
const reg = loadRegistry().registry;

function accessibleName(el: Element, doc: Document): string {
  const al = el.getAttribute("aria-label"); if (al?.trim()) return al.trim();
  const lb = el.getAttribute("aria-labelledby"); if (lb) return lb.split(/\s+/).map((id) => doc.getElementById(id)?.textContent ?? "").join(" ").trim();
  const id = el.id; const forL = id ? doc.querySelector(`label[for="${id}"]`) : null;
  const wrap = el.closest("label");
  return ((forL ?? wrap)?.textContent ?? "").trim();
}

describe("layer panel checkboxes", () => {
  it("all have a plain-text name", () => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: 1 }])), order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false };
    renderLayerPanel(document.getElementById("layer-panel")!, reg, new Store(st));
    const boxes = [...document.querySelectorAll('#layer-panel input[type="checkbox"]')];
    expect(boxes.length).toBeGreaterThan(5);
    for (const b of boxes) {
      const n = accessibleName(b, document);
      expect(n.length, b.outerHTML).toBeGreaterThan(2);
      expect(n, b.outerHTML).not.toMatch(/^on$/i);
    }
    const layerBox = boxes.find((b) => b.getAttribute("aria-label")?.startsWith("Show "));
    expect(layerBox).toBeTruthy();
  });
});
