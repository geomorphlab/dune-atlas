// @vitest-environment happy-dom
// Imagery-basemap hint visibility, and Escape closing the cell panel only when meant
// for it (Escape in the layer panel must not close the panel or lose the selected cell).
import { describe, expect, it, vi } from "vitest";
import { loadRegistry } from "../src/registry/load";
import { Store, type AppState } from "../src/store";
import { IMAGERY_HINT, renderLayerPanel } from "../src/ui/layerPanel";
import { escapeClosesCell } from "../src/ui/keys";

const reg = loadRegistry().registry;
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });

describe("imagery basemap hint", () => {
  it("shown only while an imagery basemap is chosen; opacities are not changed", () => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])), order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false };
    const store = new Store(st);
    renderLayerPanel(document.getElementById("layer-panel")!, reg, store);
    const hint = document.querySelector(".basemap-hint") as HTMLElement;
    expect(hint.textContent).toBe(IMAGERY_HINT);
    expect(hint.hidden).toBe(true);
    const img = reg.basemaps.find((b) => b.imagery)!;
    expect(img.id).toBe("esri-imagery");
    const before = JSON.stringify(store.state.layers);
    store.set({ basemap: img.id });
    expect(hint.hidden).toBe(false);
    expect(JSON.stringify(store.state.layers)).toBe(before);
    store.set({ basemap: reg.basemaps[0].id });
    expect(hint.hidden).toBe(true);
  });
});

describe("Escape and the cell panel", () => {
  const key = (target: Element, prevented = false) => { const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }); if (prevented) e.preventDefault(); Object.defineProperty(e, "target", { value: target }); return e; };
  it("closes from the map or the cell panel; not from the layer panel, a list, a popover or after another handler", () => {
    document.body.innerHTML = '<div id="map"><canvas></canvas></div><aside id="layer-panel"><select id="s"></select><input id="r" type="range"></aside><aside id="cell-panel"><button id="b"></button><input id="cr" type="range"></aside><div class="tool-pop"><button id="t"></button></div>';
    const $ = (s: string) => document.querySelector(s)!;
    expect(escapeClosesCell(key($("canvas")))).toBe(true);
    expect(escapeClosesCell(key(document.body))).toBe(true);
    expect(escapeClosesCell(key($("#b")))).toBe(true);
    expect(escapeClosesCell(key($("#cr")))).toBe(true);
    expect(escapeClosesCell(key($("#s")))).toBe(false);
    expect(escapeClosesCell(key($("#r")))).toBe(false);
    expect(escapeClosesCell(key($("#t")))).toBe(false);
    expect(escapeClosesCell(key($("canvas"), true))).toBe(false);
  });
});

import { citationFile, latLonText } from "../src/cell/downloads";
describe("Citation TXT", () => {
  it("centre as 23.25° S, 15.00° E; wind dataset and threshold recorded; the dune map named as the file in the Code record", () => {
    expect(latLonText(-23.25, 15)).toBe("23.25° S, 15.00° E");
    expect(latLonText(79, -97.5)).toBe("79.00° N, 97.50° W");
    const t = citationFile({ iy: 453, ix: 780, lat: -23.25, lon: 15 }, "era5", "threshold friction velocity u*,th = 0.15 m/s");
    expect(t).toMatch(/^Dune Atlas \(map\.geomorphlab\.org\), ERA5 0\.25° cell 453,780, centre 23\.25° S, 15\.00° E\nWind dataset: ERA5 0\.25°, 1950–2024\nValues at threshold friction velocity u\*,th = 0\.15 m\/s\n/);
    expect(t).not.toMatch(/-23\.25 N/);
    expect(t).toMatch(/Data \(dune map: dune-mask-rev1\.tif, contained in the Supplementary Code record\): Gunn, A\. \(2026\)\. geomorphlab\/dune-world: The distribution of Earth's wind-blown sand dunes - Supplementary Code \(v1\.0\.0\)\. Zenodo\./);
  });
});
