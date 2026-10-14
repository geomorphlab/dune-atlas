// @vitest-environment happy-dom
// DOM-level checks of the layer panel, threshold controls and cell panel (no WebGL: the map is
// not instantiated here). Uses the merged registry and a fixture cell.
import { describe, expect, it, beforeEach, vi } from "vitest";
import fixture from "./fixtures/flux-parity.json";
import { loadRegistry } from "../src/registry/load";
import { Store, type AppState } from "../src/store";
import { renderLayerPanel, AI_NOTICE } from "../src/ui/layerPanel";
import { metersPerPixel, spacingToPx, SPACING_KM_STEPS } from "../src/layerconfig";
import { CellPanel, MODES_OPEN_KEY, PANEL_SECTIONS, sameLocation, sectionOpenKey } from "../src/ui/cellPanel";
import { CONFIG } from "../src/config";
import type { CellData, CellStore } from "../src/cell/cellstore";
import { C } from "../src/util/constants";

const reg = loadRegistry().registry;
import { makeCell, FIELD_VARS } from "./helpers";

function initState(): AppState {
  return {
    basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14,
    layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])),
    order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false,
  };
}

function cell(hasData = true): CellData {
  const c = (fixture as unknown as { cells: { iy: number; ix: number; lat: number; lon: number; hist_idx: number[]; hist_cnt: number[] }[] }).cells[2];
  const hist = new Uint32Array(16384);
  if (hasData) c.hist_idx.forEach((k, i) => (hist[k] = c.hist_cnt[i]));
  const fields = new Float32Array(FIELD_VARS.length * 64).fill(hasData ? 0.3 : NaN);
  return makeCell({ iy: c.iy, ix: c.ix, lat: c.lat, lon: c.lon, hist, fields, hasData });
}
const fakeStore = (c: CellData) => ({ query: async () => c, attrs: {}, fieldVars: FIELD_VARS }) as unknown as CellStore;
const item = (root: HTMLElement, id: string) => root.querySelector(`.layer-item[data-layer="${id}"]`) as HTMLElement;
// in-memory localStorage (not provided by this happy-dom / Node combination)
const memStorage = (() => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; } };
})();
vi.stubGlobal("localStorage", memStorage);
const fire = (el: Element, type: string) => el.dispatchEvent(new Event(type));

describe("layer panel", () => {
  let root: HTMLElement, store: Store;
  beforeEach(() => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    root = document.getElementById("layer-panel")!;
    store = new Store(initState());
    renderLayerPanel(root, reg, store);
  });
  it("renders one item per layer (checkbox, info) and one radio per basemap; no terrain toggle; opacity only in Active layers", () => {
    expect(root.querySelectorAll(".layer-item").length).toBe(reg.layers.length);
    expect(root.querySelectorAll(".layer-item input.opacity").length).toBe(0);
    const visible = reg.layers.filter((l) => store.state.layers[l.id].visible).length;
    expect(root.querySelectorAll(".order-item input.opacity").length).toBe(visible);
    expect(root.querySelectorAll('input[name="basemap"]').length).toBe(reg.basemaps.length);
    expect(root.querySelector("#opt-terrain")).toBeNull();
    expect(root.textContent).not.toMatch(/3D terrain/i);
  });
  it("threshold control is pinned outside the scrolling body, prominent and labelled", () => {
    const pinned = root.querySelector(".pinned")!;
    expect(pinned.querySelector("#ut-slider")).not.toBeNull();
    expect(root.querySelector(".panel-body #ut-slider")).toBeNull();
    expect(pinned.querySelector(".ut-label")!.textContent).toMatch(/^Threshold friction velocity/);
    expect(pinned.querySelector(".ut-label .katex")).not.toBeNull(); // u_{*,th} rendered by KaTeX
    expect(root.querySelector("#ut-value")!.textContent).toBe("0.15 m/s");
    expect(root.querySelector("#ut-ticks option")!.getAttribute("value")).toBe("14"); // default marker
    const s = root.querySelector("#ut-slider") as HTMLInputElement;
    s.value = "30"; fire(s, "input");
    expect(store.state.utIndex).toBe(30);
    expect(root.querySelector("#ut-value")!.textContent).toBe("0.31 m/s");
  });
  it("About & citation contains the AI-assistance notice verbatim with a mailto link", () => {
    const about = root.querySelector(".about .ai-notice")!;
    expect(about.textContent).toBe("This page was created with assistance from Claude AI. I have reviewed the functionality and underlying data but if you notice any issues or errors please contact me at a.gunn@monash.edu.");
    expect(AI_NOTICE).toBe(about.textContent);
    expect(about.querySelector('a[href="mailto:a.gunn@monash.edu"]')!.textContent).toBe("a.gunn@monash.edu");
  });
  it("layer titles render TeX with KaTeX", () => {
    const l = reg.layers.find((x) => x.titleTex?.includes("$"))!;
    expect(item(root, l.id).querySelector(".layer-row label .katex")).not.toBeNull();
  });
  it("toggle, opacity and colormap chooser (with reverse, clim, reset) update the store", () => {
    const id = "qacb";
    const it_ = item(root, id);
    const cb = it_.querySelector('.layer-row input[type="checkbox"]') as HTMLInputElement;
    cb.checked = true; fire(cb, "change");
    expect(store.state.layers[id].visible).toBe(true);
    const sel = it_.querySelector('select[aria-label^="Colour map"]') as HTMLSelectElement;
    expect([...sel.querySelectorAll("optgroup")].map((g) => g.getAttribute("label"))).toEqual(["Sequential", "Diverging", "Cyclic"]);
    sel.value = "viridis"; fire(sel, "change");
    expect(store.state.layers[id].cfg?.colormap).toBe("viridis");
    const rev = it_.querySelector('input[aria-label^="Reverse"]') as HTMLInputElement;
    rev.checked = true; fire(rev, "change");
    expect(store.state.layers[id].cfg?.reverse).toBe(true);
    const lo = it_.querySelector('input[aria-label^="Colour scale minimum"]') as HTMLInputElement;
    const hi = it_.querySelector('input[aria-label^="Colour scale maximum"]') as HTMLInputElement;
    lo.value = "1"; hi.value = "500"; fire(hi, "change");
    expect(store.state.layers[id].cfg?.clim).toEqual([1, 500]);
    const lg = it_.querySelector('input[aria-label^="Logarithmic"]') as HTMLInputElement;
    expect(lg.checked).toBe(true); // registry default for qacb
    lg.checked = false; fire(lg, "change");
    expect(store.state.layers[id].cfg?.log).toBe(false);
    (it_.querySelector(".clim-row .link-button") as HTMLButtonElement).click();
    expect(store.state.layers[id].cfg).toBeUndefined();
  });
  it("directional fields offer colour map / arrows / streamlines; angles have no log option", () => {
    const it_ = item(root, "at");
    const mode = it_.querySelector('select[aria-label^="Display"]') as HTMLSelectElement;
    expect([...mode.options].map((o) => o.value)).toEqual(["colormap", "arrows", "streamlines"]);
    mode.value = "streamlines"; fire(mode, "change");
    expect(store.state.layers.at.cfg?.mode).toBe("streamlines");
    expect(it_.querySelector('input[aria-label^="Logarithmic"]')).toBeNull();
    expect(item(root, "ab").querySelector('select[aria-label^="Display"]')).not.toBeNull(); // axis
  });
  it("no 'not available' badges anywhere (availability checks removed)", () => {
    expect(root.querySelector(".badge.na")).toBeNull();
    expect(root.textContent).not.toMatch(/not available/);
  });
  it("drawing order: visible layers listed top-first with numbers, move buttons and drag reorder", () => {
    store.setLayer("at", { visible: true });
    store.setLayer("qacb", { visible: true });
    const items = () => [...root.querySelectorAll(".order-item")].map((li) => li.getAttribute("data-layer"));
    const vis = store.state.order.filter((id) => store.state.layers[id].visible);
    expect(items()).toEqual(vis);
    expect([...root.querySelectorAll(".order-num")].map((n) => n.textContent)).toEqual(vis.map((_, k) => String(k + 1)));
    // move the bottom one up (keyboard-accessible button)
    const last = vis[vis.length - 1];
    (root.querySelector(`.order-item[data-layer="${last}"] button[aria-label^="Move"][aria-label$="up"]`) as HTMLButtonElement).click();
    expect(items()[vis.length - 2]).toBe(last);
    // drag the first onto the last
    const first = items()[0]!, target = items()[vis.length - 1]!;
    const src = root.querySelector(`.order-item[data-layer="${first}"]`)!, dst = root.querySelector(`.order-item[data-layer="${target}"]`)!;
    src.dispatchEvent(new Event("dragstart"));
    dst.dispatchEvent(new Event("drop"));
    expect(items()[vis.length - 1]).toBe(first);
    // order applies to all layers in the store (hidden ones keep their place)
    expect(store.state.order.length).toBe(reg.layers.length);
  });
  it("active layers: one opacity slider per row drives the store; rows are not rebuilt while dragging", () => {
    store.setLayer("at", { visible: true });
    const row = () => root.querySelector('.order-item[data-layer="at"]')!;
    const li = row();
    const op = li.querySelector("input.opacity") as HTMLInputElement;
    expect(op.getAttribute("aria-label")).toMatch(/^Opacity of /);
    op.value = "0.35"; fire(op, "input");
    expect(store.state.layers.at.opacity).toBe(0.35);
    expect(row()).toBe(li);
    expect(row().querySelector("input.opacity")).toBe(op);
    store.setLayer("at", { opacity: 0.6 });
    expect(op.value).toBe("0.6");
  });
  it("drawing order: × unticks the layer; re-ticking puts it back on top; title has no '(top = on top)'", () => {
    store.setLayer("at", { visible: true });
    store.setLayer("qacb", { visible: true });
    const items = () => [...root.querySelectorAll(".order-item")].map((li) => li.getAttribute("data-layer"));
    expect(root.querySelector(".order summary")!.textContent).toBe("Active layers");
    const victim = items()[items().length - 1]!;
    (root.querySelector(`.order-item[data-layer="${victim}"] button.remove`) as HTMLButtonElement).click();
    expect(store.state.layers[victim].visible).toBe(false);
    expect(items()).not.toContain(victim);
    const cb = item(root, victim).querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(cb.checked).toBe(false);
    cb.checked = true; fire(cb, "change");
    expect(store.state.layers[victim].visible).toBe(true);
    expect(items()[0]).toBe(victim);
    expect(store.state.order[0]).toBe(victim);
  });
  it("dataset selector is shown for the two wind datasets (ERA5-Land, ERA5)", () => {
    const sel = root.querySelector("#dataset-select") as HTMLSelectElement;
    // short option text (fits the embed panel); the period and land rule are in the tooltips
    expect([...sel.options].map((o) => o.textContent)).toEqual(["ERA5-Land 0.1°", "ERA5 0.25°"]);
    expect([...sel.options].map((o) => o.title)).toEqual(["ERA5-Land 0.1°, 1950–2024; land cells: land–sea mask fraction > 0.5", "ERA5 0.25°, 1950–2024; land cells: land–sea mask fraction > 0"]);
    expect(sel.title).toBe(sel.options[sel.selectedIndex].title);
  });
  it("dunes: fill colour picker and invert only (no outline controls, no colour swatch)", () => {
    const it_ = item(root, "dunes");
    const fc = it_.querySelector('input[aria-label^="Fill colour"]') as HTMLInputElement;
    expect(fc.value).toBe("#a0a0a0"); // neutral grey default (registry), opacity 0.55
    expect(reg.layers.find((l) => l.id === "dunes")!.style!.fill!["fill-opacity"]).toBe(0.55);
    fc.value = "#123456"; fire(fc, "input");
    expect(store.state.layers.dunes.cfg?.fill).toBe("#123456");
    expect(it_.querySelector('input[aria-label^="Outline"]')).toBeNull();
    expect(it_.querySelector('input[aria-label^="Show outlines"]')).toBeNull();
    expect(it_.querySelectorAll('input[type="color"]').length).toBe(1);
    expect(it_.querySelector(".swatch")).toBeNull();
    const inv = it_.querySelector('input[aria-label^="Invert"]') as HTMLInputElement;
    inv.checked = true; fire(inv, "change");
    expect(store.state.layers.dunes.cfg?.invert).toBe(true);
    expect(it_.querySelector(".legend-note")!.textContent).toMatch(/Land without mapped dunes/);
    expect(it_.querySelector(".info-popover")!.textContent).toMatch(/beyond ±85\.05° \(interior Antarctica\)/);
    inv.checked = false; fire(inv, "change");
    expect(store.state.layers.dunes.cfg?.invert).toBeUndefined();
  });
  it("spacing slider: endpoint labels Finer (left) / Coarser (right), no km or px readout; stored as spacingKm", () => {
    store.setLayer("at", { visible: true });
    store.setLayerConfig("at", { mode: "streamlines" });
    const it_ = item(root, "at");
    const ds = it_.querySelector('input[aria-label^="Line spacing"]') as HTMLInputElement;
    const row = ds.closest("label")!;
    // order in the row: "Spacing", Finer, slider, Coarser; finer = smaller ground spacing = left
    const ends = [...row.querySelectorAll(".spacing-end")].map((e) => e.textContent);
    expect(ends).toEqual(["Finer", "Coarser"]);
    expect(row.firstElementChild!.textContent).toBe("Finer");
    expect(row.lastElementChild!.textContent).toBe("Coarser");
    expect(SPACING_KM_STEPS[0]).toBeLessThan(SPACING_KM_STEPS[SPACING_KM_STEPS.length - 1]);
    expect(row.textContent).toBe("Spacing FinerCoarser");
    expect(it_.textContent).not.toMatch(/\bkm\b|\bpx\b|\d+\s*km/);
    expect(it_.querySelector(".spacing-km, .spacing-px, output")).toBeNull();
    expect(ds.getAttribute("aria-label")).not.toMatch(/km|px/);
    expect(row.getAttribute("title")).not.toMatch(/km|px/);
    expect(ds.value).toBe("3"); // default 100 km step
    expect(ds.getAttribute("aria-valuetext")).toBe("medium");
    ds.value = "5"; fire(ds, "input"); fire(ds, "change");
    expect(store.state.layers.at.cfg?.spacingKm).toBe(500);
    expect(ds.getAttribute("aria-valuetext")).toBe("coarser");
    ds.value = "3"; fire(ds, "input"); fire(ds, "change");
    expect(store.state.layers.at.cfg?.spacingKm).toBeUndefined(); // default not stored
  });
  it("spacing: an old link's km value restores the same slider position; zoom/move never writes the store", () => {
    store.setLayer("at", { visible: true });
    const it_ = item(root, "at");
    const ds = it_.querySelector('input[aria-label^="Line spacing"]') as HTMLInputElement;
    for (const [km, pos] of [[10, "0"], [20, "1"], [50, "2"], [200, "4"], [500, "5"], [1000, "6"]] as const) {
      // as decoded from ~km= (URL) / the share link
      store.setLayerConfig("at", { mode: "streamlines", spacingKm: km });
      expect(ds.value).toBe(pos);
    }
    store.setLayerConfig("at", { mode: "streamlines", spacingKm: 500 });
    const before = ds.value;
    let changes = 0;
    store.subscribe((_, ch) => { if (ch.has("layers")) changes++; });
    for (const z of [1, 3, 6, 9]) spacingToPx(store.state.layers.at.cfg!.spacingKm!, metersPerPixel(-24.5, z));
    window.dispatchEvent(new Event("resize"));
    expect(changes).toBe(0);
    expect(store.state.layers.at.cfg?.spacingKm).toBe(500);
    expect(ds.value).toBe(before);
    expect(it_.textContent).not.toMatch(/km|px/);
  });
  it("legend follows the chosen colormap and arrows mode", () => {
    store.setLayer("at", { visible: true });
    store.setLayerConfig("at", { mode: "arrows" });
    expect(item(root, "at").querySelector(".legend-vec")!.textContent).toMatch(/Arrows: direction of transport/);
    store.setLayer("ab", { visible: true });
    store.setLayerConfig("ab", { mode: "streamlines" });
    expect(item(root, "ab").querySelector(".legend-vec")!.textContent).toMatch(/orientation axis/);
  });
});

describe("dataset selector", () => {
  it("is shown with a single dataset too (one option), hidden without datasets", () => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const root = document.getElementById("layer-panel")!;
    renderLayerPanel(root, { ...reg, datasets: reg.datasets!.slice(0, 1) }, new Store(initState()));
    expect([...(root.querySelector("#dataset-select") as HTMLSelectElement).options].map((o) => o.value)).toEqual([reg.datasets![0].id]);
    renderLayerPanel(root, { ...reg, datasets: [] }, new Store(initState()));
    expect(root.querySelector("#dataset-select")).toBeNull();
  });
  it("is shown, lists the datasets and drives the store", () => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const root = document.getElementById("layer-panel")!;
    const reg2 = reg;
    const store = new Store(initState());
    renderLayerPanel(root, reg2, store);
    const sel = root.querySelector("#dataset-select") as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual(["era5-land", "era5"]);
    sel.value = "era5"; fire(sel, "change");
    expect(store.state.dataset).toBe("era5");
  });
});

describe("cell panel", () => {
  let store: Store, root: HTMLElement;
  const open = async (c = cell()) => {
    const p = new CellPanel(root, store.state.utIndex, { windSectors: 16, fluxSectors: 32, onClose: () => {}, threshold: { def: reg.threshold, store } });
    store.subscribe((s, ch) => { if (ch.has("utIndex")) p.setThreshold(s.utIndex); });
    await p.show(fakeStore(c), 1145, 1948);
    return p;
  };
  beforeEach(() => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    root = document.getElementById("cell-panel")!;
    store = new Store(initState());
    memStorage.clear();
  });
  it("renders roses, polar modes (expanded by default), table, downloads; compact threshold synced with the store", async () => {
    await open();
    expect(root.querySelectorAll("svg.rose").length).toBe(2);
    const det = root.querySelector("details.modes") as HTMLDetailsElement;
    expect(det.open).toBe(true);
    expect(det.querySelector("svg.modes-plot")).not.toBeNull();
    expect(root.querySelectorAll(".summary tbody.tgroup-rows tr").length).toBe(23 - C.WITHHELD_VARS.length + 2);   // + dunes, centre (rows in groups)
    // terse labels: no parentheses (round 5); grid cell and hours only in the downloads
    for (const th of root.querySelectorAll(".summary tbody.tgroup-rows th")) expect(th.textContent).not.toMatch(/[()]/);
    expect(root.querySelector('.summary tr[data-field="cell"]')).toBeNull();
    expect(root.querySelector('.summary tr[data-field="hours"]')).toBeNull();
    expect([...root.querySelectorAll(".downloads button")].map((b) => b.textContent)).toEqual(["NetCDF (.nc)", "CSV bundle (.zip)", "Citation (TXT)", "Copy citation"]);
    const mini = root.querySelector("#cell-ut-slider") as HTMLInputElement;
    expect(mini).not.toBeNull();
    mini.value = "40"; fire(mini, "input");
    expect(store.state.utIndex).toBe(40);
    expect(root.querySelector("#cell-ut-value")!.textContent).toBe("0.41 m/s");
    expect(root.querySelector(".cell-meta")!.textContent).toContain("0.41 m/s");
    expect(root.querySelector("#cell-ut-slider")).toBe(mini); // not rebuilt while dragging
  });
  it("modes plot: a collapse is remembered in localStorage for new panels", async () => {
    await open();
    const det = root.querySelector("details.modes") as HTMLDetailsElement;
    det.open = false; det.dispatchEvent(new Event("toggle"));
    expect(memStorage.getItem(MODES_OPEN_KEY)).toBe("0");
    await open();
    expect((root.querySelector("details.modes") as HTMLDetailsElement).open).toBe(false);
    const d2 = root.querySelector("details.modes") as HTMLDetailsElement;
    d2.open = true; d2.dispatchEvent(new Event("toggle"));
    expect(memStorage.getItem(MODES_OPEN_KEY)).toBe("1");
  });
  it("every section heading is a disclosure (same markup as Modes); open by default; each state remembered", async () => {
    await open();
    const body = root.querySelector(".cell-body")!;
    const secs = [...body.querySelectorAll("details.section")] as HTMLDetailsElement[];
    // the quantity plot (section id "qsdiv") is present for every cell (DP by default)
    const present = [...PANEL_SECTIONS];
    expect(secs.map((d) => d.dataset.section)).toEqual(present);
    // no heading outside a disclosure summary; one h3 per summary; same classes as Modes
    for (const h3 of body.querySelectorAll("h3")) expect(h3.parentElement!.matches("details.section > summary")).toBe(true);
    for (const d of secs) {
      expect(d.classList.contains("section")).toBe(true);
      expect(d.firstElementChild!.tagName).toBe("SUMMARY");
      expect(d.firstElementChild!.querySelectorAll("h3").length).toBe(1);
      expect(d.open).toBe(true);
    }
    const title = (k: string) => body.querySelector(`details[data-section="${k}"] > summary`)!.textContent!.replace(/\s+/g, " ");
    expect(title("summary")).toMatch(/^Cell summary at u.*= 0\.\d\d m\/s/);
    expect(title("downloads")).toBe("Download & cite");
    // collapse each; a new panel (another cell) keeps every choice
    for (const d of secs) { d.open = false; d.dispatchEvent(new Event("toggle")); }
    for (const k of present) expect(memStorage.getItem(sectionOpenKey(k))).toBe("0");
    expect(MODES_OPEN_KEY).toBe("duneAtlas.cellPanel.modesOpen");
    await open();
    const again = [...root.querySelectorAll(".cell-body details.section")] as HTMLDetailsElement[];
    expect(again.map((d) => d.open)).toEqual(present.map(() => false));
    // threshold change re-renders the table heading in place (still inside its summary), state kept
    const mini = root.querySelector("#cell-ut-slider") as HTMLInputElement;
    mini.value = "40"; fire(mini, "input");
    const sh = root.querySelector('details[data-section="summary"] > summary > h3')!;
    expect(sh.textContent).toContain("0.41 m/s");
    expect((root.querySelector('details[data-section="summary"]') as HTMLDetailsElement).open).toBe(false);
    const dl = root.querySelector('details[data-section="downloads"]') as HTMLDetailsElement;
    dl.open = true; dl.dispatchEvent(new Event("toggle"));
    expect(memStorage.getItem("duneAtlas.cellPanel.downloadsOpen")).toBe("1");
    expect(memStorage.getItem("duneAtlas.cellPanel.summaryOpen")).toBe("0");
  });
  it("scroll position and collapsed sections survive re-renders at the same location; another cell starts at the top", async () => {
    const c0 = cell();
    const p = await open(c0);
    const sc = () => root.querySelector(".cell-scroll") as HTMLElement;
    const el = sc();
    el.scrollTop = 640;
    expect(el.scrollTop).toBe(640);
    const fr = root.querySelector('details[data-section="fluxRose"]') as HTMLDetailsElement;
    fr.open = false; fr.dispatchEvent(new Event("toggle"));
    // threshold change (in-place update) and a full re-render (e.g. resize)
    store.set({ utIndex: 30 });
    expect(sc()).toBe(el);
    expect(el.scrollTop).toBe(640);
    p.render();
    expect(sc()).toBe(el);
    expect(el.scrollTop).toBe(640);
    // re-show the same cell (as after a dataset switch to the same indices): the old content stays
    // (busy) while loading, then the new content at the same position
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow = { query: async () => { await gate; return { ...c0 }; }, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore;
    const shown = p.show(slow, c0.iy, c0.ix);
    await new Promise((r) => setTimeout(r, 5));
    expect(root.textContent).not.toContain("Loading");
    expect(root.querySelector("svg.rose")).not.toBeNull(); // previous content still shown
    expect(root.querySelector(".cell-body")!.getAttribute("aria-busy")).toBe("true");
    expect(el.scrollTop).toBe(640);
    release(); await shown;
    expect(sc()).toBe(el);
    expect(el.scrollTop).toBe(640);
    expect(root.querySelector(".cell-body")!.hasAttribute("aria-busy")).toBe(false);
    expect((root.querySelector('details[data-section="fluxRose"]') as HTMLDetailsElement).open).toBe(false);
    expect((root.querySelector('details[data-section="windRose"]') as HTMLDetailsElement).open).toBe(true);
    // a neighbouring 0.1° cell is another location: top, loading message while it loads
    const c1 = { ...c0, iy: c0.iy + 1, lat: c0.lat - 0.1, id: c0.id + 3600 };
    const shown2 = p.show(fakeStore(c1), c1.iy, c1.ix);
    await shown2;
    expect(sc().scrollTop).toBe(0);
    expect((root.querySelector('details[data-section="fluxRose"]') as HTMLDetailsElement).open).toBe(false); // collapse remembered
  });
  it("sameLocation: either centre inside the other cell (ERA5-Land 0.1° / ERA5 0.25°), antimeridian", () => {
    const L = { lat0: 90, dlat: -0.1, lon0: -180, dlon: 0.1, ny: 1801, nx: 3600 }, E = { lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 };
    expect(sameLocation({ lat: -24.5, lon: 15.2, grid: L }, { lat: -24.5, lon: 15.25 }, E)).toBe(true);
    expect(sameLocation({ lat: -24.5, lon: 15.25, grid: E }, { lat: -24.5, lon: 15.3 }, L)).toBe(true);
    expect(sameLocation({ lat: -24.5, lon: 15.2, grid: L }, { lat: -24.5, lon: 15.3 }, L)).toBe(false);
    expect(sameLocation({ lat: -24.5, lon: 15.25, grid: E }, { lat: -24.5, lon: 15.5 }, E)).toBe(false);
    expect(sameLocation({ lat: 0, lon: 179.9, grid: L }, { lat: 0, lon: -180 }, E)).toBe(true);
  });
  it("default rose sectors are 128 (wind and flux)", async () => {
    expect(CONFIG.windRoseSectors).toBe(128);
    expect(CONFIG.fluxRoseSectors).toBe(128);
  });
  it("DP/RDP/RDP/DP/RDD from stored fields; 4 arrows on the flux rose; 5 traces + axis twin in the polar plot", async () => {
    await open();
    const kv = root.querySelector(".kv")!;
    expect([...kv.querySelectorAll("dt")].map((d) => d.textContent)).toEqual(["DP", "RDP", "RDP/DP", "RDD"]);
    expect(kv.querySelector("dd")!.textContent!.replace(/\u00a0/g, " ")).toBe("9.47×106 m²/yr");
    expect(root.querySelectorAll("svg.rose")[1].querySelectorAll(".rose-arrow").length).toBe(4);
    expect((root.querySelector("svg.modes-plot")!.innerHTML.match(/class="current-mode"/g) ?? []).length).toBe(6);
  });
  it("sector sliders change the number of petals (divisors of 128) without rebuilding the slider", async () => {
    await open();
    const sliders = root.querySelectorAll(".bin-row input") as NodeListOf<HTMLInputElement>;
    expect(sliders.length).toBe(2);
    const wind = sliders[0];
    wind.value = "0"; fire(wind, "input"); // 8 sectors
    expect(wind.parentElement!.querySelector("output")!.textContent).toBe("8");
    expect(root.querySelector(".fig-svg")!.querySelector("desc")!.textContent).toMatch(/8 sectors/);
    expect(root.querySelectorAll(".bin-row input")[0]).toBe(wind);
    const flux = sliders[1];
    flux.value = "4"; fire(flux, "input"); // 128
    expect(root.querySelectorAll("svg.rose")[1].querySelector("desc")!.textContent).toMatch(/128 sectors/);
  });
  it("flux rose radial axis: % of total by default, toggle to m²/yr; axis label says which; DP in caption", async () => {
    await open();
    const flux = () => root.querySelectorAll("svg.rose")[1];
    expect(flux().querySelector(".axis-label")!.textContent).toBe("% of total flux");
    expect(root.querySelectorAll(".fig")[1].querySelector(".caption")!.textContent!.replace(/\u00a0/g, " ")).toMatch(/^Flat bed: DP = [0-9.]+ m²\/yr/);
    const abs = root.querySelector('.axis-toggle input[value="abs"]') as HTMLInputElement;
    abs.checked = true; fire(abs, "change");
    expect(flux().querySelector(".axis-label")!.textContent).toBe("m²/yr per sector");
    expect(root.querySelectorAll("svg.rose")[0].querySelector(".axis-label")!.textContent).toBe("% of hours");
  });
  it("table: Symbol | Quantity | Value columns, KaTeX symbols, no program variable names, fractions and em dash", async () => {
    const c = cell();
    const iq = FIELD_VARS.indexOf("qhbf"), ie = FIELD_VARS.indexOf("qhef");
    c.fields[iq * 64 + 14] = 0.8125;
    c.fields[ie * 64 + 14] = NaN;
    await open(c);
    const ths = [...root.querySelectorAll(".summary thead th")].map((t) => t.textContent);
    expect(ths).toEqual(["Symbol", "Quantity", "Value"]);
    const row = (v: string) => root.querySelector(`.summary tr[data-field="${v}"]`)!;
    expect(row("qhbf").querySelector("td.num")!.textContent!.replace(/\u00a0/g, " ")).toBe("0.813 fraction (0–1)");
    expect(row("qhef").querySelector("td.num")!.textContent).toBe("—");
    expect(row("dpm").querySelector("td.sym .katex")).not.toBeNull();
    const visible = root.querySelector(".summary table")!.textContent!;
    for (const v of FIELD_VARS) expect(visible).not.toMatch(new RegExp(`\\b${v}\\b`));
  });
  it("flux rose mode dropdown: flat bed / elongation / transverse; caption names the mode and total", async () => {
    await open();
    const sel = root.querySelector('select[aria-label="Flux rose mode"]') as HTMLSelectElement;
    expect([...sel.options].map((o) => o.textContent)).toEqual(["Flat bed", "Elongation (αE)", "Transverse migration (αH)"]);
    const cap = () => root.querySelectorAll(".fig")[1].querySelector(".caption")!.textContent!.replace(/\u00a0/g, " ");
    expect(cap()).toMatch(/^Flat bed: DP = /);
    sel.value = "elongation"; fire(sel, "change");
    expect(cap()).toMatch(/^Elongation \(αE\) \(— = mode direction undefined at this threshold\): .* = [0-9.]+ m²\/yr\./);
    expect(root.querySelectorAll(".fig")[1].querySelector(".caption .katex")).not.toBeNull(); // ⟨|Q(αE)|⟩ in KaTeX
    sel.value = "transverse"; fire(sel, "change");
    expect(cap()).toMatch(/^Transverse migration \(αH\)/);
    expect(root.querySelectorAll("svg.rose")[1].querySelectorAll("path").length).toBeGreaterThan(4);
  });
  it("arrows / table / polar plot hide a mode whose defining flux is zero", async () => {
    const c = cell();
    const set = (v: string, val: number) => { c.fields[FIELD_VARS.indexOf(v) * 64 + 14] = val; };
    set("qale", 0); set("qace", 0); // no elongation-mode crest flux -> αE, αO undefined
    set("dpm", 0); set("rdpm", 0);  // no flat-bed transport -> RDD undefined (mask: rdpm > 0)
    await open(c);
    const arrows = root.querySelectorAll("svg.rose")[1].querySelectorAll(".rose-arrow");
    expect(arrows.length).toBe(2); // αH (axis) and αT only
    const row = (v: string) => root.querySelector(`.summary tr[data-field="${v}"] td.num`)!.textContent;
    expect(row("ae")).toBe("—");
    expect(row("ao")).toBe("—");
    expect(row("rdpa")).toBe("—");
    expect(row("at")).not.toBe("—");
    expect(root.querySelector(".kv")!.textContent).toMatch(/RDD—/);
    // polar plot: current-threshold markers only for defined modes (αT, αH both ways)
    expect((root.querySelector("svg.modes-plot")!.innerHTML.match(/class="current-mode"/g) ?? []).length).toBe(3);
  });
  it("resizable: drag handle with keyboard resizing, persisted in localStorage", async () => {
    const mem = new Map<string, string>();
    (globalThis as unknown as { localStorage: Pick<Storage, "getItem" | "setItem"> }).localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)) };
    await open();
    const hd = root.querySelector(".resize-handle") as HTMLElement;
    expect(hd.getAttribute("role")).toBe("separator");
    hd.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    const w = Number(localStorage.getItem("duneAtlas.cellPanel.width"));
    expect(w).toBeGreaterThanOrEqual(320);
    expect(document.documentElement.style.getPropertyValue("--cell-w")).toBe(`${w}px`);
  });
  it("ocean cell shows an empty state", async () => {
    await open(cell(false));
    expect(root.querySelector(".empty-state")).not.toBeNull();
    expect(root.querySelector("svg.rose")).toBeNull();
  });
  it("load errors are reported (visitor text; the error itself in the tooltip)", async () => {
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {} });
    await p.show({ query: async () => { throw new Error("HTTP 403"); } } as unknown as CellStore, 1, 1);
    const al = root.querySelector('[role="alert"]')!;
    expect(al.textContent).toBe("The data for this cell could not be loaded. Click the cell again to retry.");
    expect(al.getAttribute("title")).toContain("HTTP 403");
  });
});
