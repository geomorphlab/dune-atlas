// @vitest-environment happy-dom
// Tour steps that demonstrate the UI: step "layers" opens the drift-potential group and the
// Display options of RDD, step "cell" opens the cell panel for the example Namib cell. Every way of
// leaving a step (Next, Back, Skip, Esc, click outside, Done) must restore the exact previous UI:
// group / Display open states, layer-panel scroll and collapsed state, the previously selected cell
// (or none) and its panel scroll, the bottom-sheet height. No layer is ever added.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tour } from "../src/core/ui/tour";
import { TOUR_FALLBACK, TOUR_STEPS } from "../src/core/ui/helpText";
import { DEMO_LAYER, tourHooks } from "../src/core/ui/tourHooks";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import { loadRegistry } from "../src/core/registry/load";
import { Store, type AppState } from "../src/core/store";

vi.stubGlobal("localStorage", (() => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear() }; })());
const reg = loadRegistry().registry;
const EXAMPLE: [number, number] = [1145, 1952];
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const stepIndex = (id: string) => TOUR_STEPS.findIndex((s) => s.id === id);

let store: Store, layerPanel: HTMLElement, cellRoot: HTMLElement, panel: { scrollTop: number; shownCell: { iy: number; ix: number } | null };
let fail = false, renders = 0;
function page(cell: [number, number] | null = null) {
  document.body.innerHTML = '<div id="app"><main id="map"></main><aside id="layer-panel"></aside><aside id="cell-panel" hidden></aside></div>';
  const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: 1 }])), order: reg.layers.map((l) => l.id), dataset: "era5-land", cell, embed: false };
  store = new Store(st);
  layerPanel = document.getElementById("layer-panel")!;
  renderLayerPanel(layerPanel, reg, store);
  cellRoot = document.getElementById("cell-panel")!;
  // a stand-in for the cell panel: renders (asynchronously, like a fetch) when the selection changes
  let scroll = 0;
  panel = { get scrollTop() { return scroll; }, set scrollTop(v: number) { scroll = v; }, shownCell: null };
  const render = (c: [number, number] | null) => {
    renders++;
    if (!c) { cellRoot.hidden = true; cellRoot.innerHTML = ""; panel.shownCell = null; return; }
    cellRoot.hidden = false; scroll = 0;
    cellRoot.innerHTML = '<div class="cell-threshold"></div><div class="cell-body"><p class="status">Loading…</p></div>';
    setTimeout(() => {
      cellRoot.querySelector(".cell-body")!.innerHTML = fail ? '<p class="status error">failed</p>' : `<div class="summary"><table data-cell="${c}"></table></div><details class="section downloads" data-section="downloads"><summary>Download &amp; cite</summary></details>`;
      panel.shownCell = { iy: c[0], ix: c[1] };
    }, 20);
  };
  if (cell) render(cell);
  store.subscribe((s, ch) => { if (ch.has("cell")) render(s.cell); });
}
function tour(example: () => Promise<[number, number] | null> = async () => EXAMPLE) {
  return new Tour(TOUR_STEPS, { hooks: tourHooks({ layerPanel, store, panel: panel as never, cellRoot, exampleCell: example, timeoutMs: 500 }) });
}
const item = () => layerPanel.querySelector(`.layer-item[data-layer="${DEMO_LAYER}"]`) as HTMLElement;
const group = () => item().closest("details.layer-group") as HTMLDetailsElement;
const display = () => item().querySelector("details.display-opts") as HTMLDetailsElement;
const body = () => layerPanel.querySelector(".panel-body") as HTMLElement;
const layersSnapshot = () => JSON.stringify(Object.entries(store.state.layers).map(([k, v]) => [k, v.visible]));
const pop = () => document.querySelector(".tour-pop") as HTMLElement;
const btn = (c: string) => pop().querySelector(c) as HTMLButtonElement;
const goTo = async (t: Tour, id: string) => { t.start(); for (let i = 0; i < stepIndex(id); i++) btn(".tour-next").click(); await t.ready; };
const leaveBy = async (t: Tour, how: string) => {
  if (how === "next") btn(".tour-next").click();
  else if (how === "back") btn(".tour-back").click();
  else if (how === "skip") btn(".tour-skip").click();
  else if (how === "esc") pop().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  else if (how === "outside") (document.querySelector(".tour-backdrop") as HTMLElement).click();
  await t.ready; await tick(40); await t.ready;
};
beforeEach(() => { fail = false; renders = 0; });

describe("tour step 4 (layers): Display of RDD opened, then restored", () => {
  it("the step text explains Display; the example layer's Display section is the spotlight target", () => {
    const s = TOUR_STEPS[stepIndex("layers")];
    expect(stepIndex("layers")).toBe(4);
    expect(s.body).toMatch(/Display/);
    expect(s.body).toMatch(/colour/);
    expect(s.body).toMatch(/limits/);
    expect(s.body).toMatch(/arrows or streamlines/);
    expect(s.targets[0]).toContain(DEMO_LAYER);
  });
  for (const how of ["next", "back", "skip", "esc", "outside"]) {
    it(`entering opens group + Display (layer not added); leaving by ${how} restores open states, scroll, collapsed`, async () => {
      page();
      group().open = false; display().open = false; body().scrollTop = 37;
      layerPanel.querySelector<HTMLButtonElement>(".panel-toggle")!.click(); // collapse the list
      expect(layerPanel.classList.contains("collapsed")).toBe(true);
      const before = layersSnapshot();
      const t = tour();
      await goTo(t, "layers");
      expect(group().open).toBe(true);
      expect(display().open).toBe(true);
      expect(layerPanel.classList.contains("collapsed")).toBe(false);
      expect(pop().dataset.step).toBe("layers");
      expect(document.querySelector(".tour-spot")).not.toBeNull();
      expect(layersSnapshot()).toBe(before);
      await leaveBy(t, how);
      expect(group().open).toBe(false);
      expect(display().open).toBe(false);
      expect(layerPanel.classList.contains("collapsed")).toBe(true);
      expect(body().scrollTop).toBe(37);
      expect(item().classList.contains("tour-demo")).toBe(false);
      expect(layersSnapshot()).toBe(before);
    });
  }
  for (const startOpen of [false, true]) {
    it(`layer panel initially ${startOpen ? "open" : "collapsed"}: the step shows it open with RDD's Display spotlit; leaving restores it ${startOpen ? "open" : "collapsed"}`, async () => {
      page();
      const toggle = layerPanel.querySelector<HTMLButtonElement>(".panel-toggle")!;
      if (layerPanel.classList.contains("collapsed") === startOpen) toggle.click();
      expect(layerPanel.classList.contains("collapsed")).toBe(!startOpen);
      group().open = false; display().open = false;
      // layout stand-in: the item has a box only while the list is shown
      item().getBoundingClientRect = () => (layerPanel.classList.contains("collapsed") ? new DOMRect(0, 0, 0, 0) : new DOMRect(20, 300, 300, 140));
      const t = tour();
      await goTo(t, "layers");
      expect(layerPanel.classList.contains("collapsed")).toBe(false);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(group().open && display().open).toBe(true);
      expect(document.querySelector(".tour")!.classList.contains("no-target")).toBe(false);
      const spot = document.querySelector(".tour-spot") as HTMLElement;
      expect(parseFloat(spot.style.width)).toBeGreaterThanOrEqual(300);
      expect(parseFloat(spot.style.top)).toBeLessThanOrEqual(300);
      await leaveBy(t, "next");
      expect(layerPanel.classList.contains("collapsed")).toBe(!startOpen);
      expect(toggle.getAttribute("aria-expanded")).toBe(String(startOpen));
      expect([group().open, display().open]).toEqual([false, false]);
      t.end(false); await t.ready;
    });
  }
  it("narrow screen (mobile): the list starts collapsed; the step opens it and leaving collapses it again", async () => {
    const mm = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", mm);
    try {
      page();
      expect(mm).toHaveBeenCalled();
      expect(layerPanel.classList.contains("collapsed")).toBe(true);
      const t = tour();
      await goTo(t, "layers");
      expect(layerPanel.classList.contains("collapsed")).toBe(false);
      expect(display().open).toBe(true);
      await leaveBy(t, "esc");
      expect(layerPanel.classList.contains("collapsed")).toBe(true);
    } finally { vi.unstubAllGlobals(); vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} }); }
  });
  it("a group that was already open with Display open stays so", async () => {
    page(); group().open = true; display().open = true;
    const t = tour(); await goTo(t, "layers"); await leaveBy(t, "next");
    expect(group().open).toBe(true); expect(display().open).toBe(true);
    t.end(false); await t.ready;
  });
});

describe("tour step 6 (cell): example cell opened without moving the map, then restored", () => {
  it("step text names the Namib example and the panel's own u*,th slider", () => {
    const s = TOUR_STEPS[stepIndex("cell")];
    expect(stepIndex("cell")).toBe(6);
    expect(s.body).toMatch(/Namib/);
    expect(s.body).toMatch(/u_\{\*,th\}/);
    expect(s.body).toBe("Clicking a land cell opens the cell panel, shown here for a dune cell in the Namib Sand Sea: wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own $u_{*,th}$ slider at the top (outlined), linked to the main one. At the bottom you can download these data in NetCDF or CSV files and access citation information. The crosshair next to its title centres the map on the cell.");
  });
  for (const how of ["next", "back", "skip", "esc", "outside"]) {
    it(`no prior selection: example shown, slider outlined; leaving by ${how} closes the panel again`, async () => {
      page(null);
      const t = tour();
      await goTo(t, "cell");
      expect(store.state.cell).toEqual(EXAMPLE);
      expect(cellRoot.hidden).toBe(false);
      expect(cellRoot.querySelector(".summary table")).not.toBeNull();
      expect(cellRoot.querySelector(".cell-threshold")!.classList.contains("tour-outline")).toBe(true);
      expect(cellRoot.querySelector('[data-section="downloads"]')!.classList.contains("tour-outline")).toBe(true);
      expect((cellRoot.querySelector('[data-section="downloads"]') as HTMLDetailsElement).open).toBe(false); // outlined, not opened
      expect(pop().querySelector(".tour-note")).toBeNull();
      expect(pop().classList.contains("tour-loading")).toBe(false);
      await leaveBy(t, how);
      expect(store.state.cell).toBeNull();
      expect(cellRoot.hidden).toBe(true);
    });
    it(`prior selection + scroll: leaving by ${how} re-selects it and restores its scroll and the sheet height`, async () => {
      page([1000, 2000]);
      await tick(40);
      panel.scrollTop = 640;
      document.documentElement.style.setProperty("--cell-h", "300px");
      const t = tour();
      await goTo(t, "cell");
      expect(store.state.cell).toEqual(EXAMPLE);
      expect(document.documentElement.style.getPropertyValue("--cell-h")).toBe(""); // default sheet height
      await leaveBy(t, how);
      expect(store.state.cell).toEqual([1000, 2000]);
      expect(panel.shownCell).toEqual({ iy: 1000, ix: 2000 });
      expect(panel.scrollTop).toBe(640);
      expect(document.documentElement.style.getPropertyValue("--cell-h")).toBe("300px");
      expect(cellRoot.querySelector(".tour-outline")).toBeNull();
      document.documentElement.style.removeProperty("--cell-h");
    });
  }
  it("prior selection is the example cell itself: kept, scroll restored, not reloaded on leave", async () => {
    page(EXAMPLE); await tick(40); panel.scrollTop = 120;
    const t = tour(); await goTo(t, "cell");
    const n = renders;
    await leaveBy(t, "next");
    expect(store.state.cell).toEqual(EXAMPLE);
    expect(renders).toBe(n);
    expect(panel.scrollTop).toBe(120);
    t.end(false); await t.ready;
  });
  it("no layer is added and the map view is untouched (the hooks only set the selected cell)", async () => {
    page(null);
    const before = JSON.stringify({ ...store.state, cell: null });
    const t = tour(); await goTo(t, "cell");
    expect(JSON.stringify({ ...store.state, cell: null })).toBe(before);
    t.end(false); await t.ready;
  });
  it("fetch fails or offline: fallback text, previous state restored", async () => {
    page(null); fail = true;
    const t = tour(); await goTo(t, "cell");
    expect(pop().querySelector(".tour-note")!.textContent).toBe(TOUR_FALLBACK.cell);
    await leaveBy(t, "skip");
    expect(store.state.cell).toBeNull();
  });
  it("example cell unavailable (cell store did not load): fallback text, nothing selected", async () => {
    page(null);
    const t = tour(async () => { throw new Error("offline"); }); await goTo(t, "cell");
    expect(store.state.cell).toBeNull();
    expect(pop().querySelector(".tour-note")!.textContent).toBe(TOUR_FALLBACK.cell);
    t.end(false); await t.ready;
  });
  it("clicking through quickly (Next before the example has loaded) still restores", async () => {
    page([1000, 2000]); await tick(40); panel.scrollTop = 50;
    const g0 = group().open, d0 = display().open;
    const t = tour(); t.start();
    for (let i = 0; i < stepIndex("cell"); i++) btn(".tour-next").click();
    btn(".tour-next").click(); btn(".tour-back").click(); btn(".tour-skip").click();
    await t.ready; await tick(40); await t.ready;
    expect(store.state.cell).toEqual([1000, 2000]);
    expect(panel.scrollTop).toBe(50);
    expect([group().open, display().open]).toEqual([g0, d0]);
  });
});
