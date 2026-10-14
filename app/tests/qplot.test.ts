// @vitest-environment happy-dom
// "<quantity> vs threshold" plot (PI request 2026-10): selector over every per-threshold quantity (layer-list
// names), DP by default, title / caption / axis / live value / export follow the choice, the choice is stored
// (per body) and in share links (backwards compatible); ±60,000 and gaps do not wreck the axis; x labels fit.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CellPanel } from "../src/ui/cellPanel";
import type { CellStore } from "../src/cell/cellstore";
import { makeCell, FIELD_VARS } from "./helpers";
import fixture from "./fixtures/flux-parity.json";
import { loadRegistry } from "../src/registry/load";
import { C } from "../src/util/constants";
import { DEFAULT_PLOT, PLOT_STORAGE, plotQuantities } from "../src/cell/qplot";
import { linePlotSvg } from "../src/cell/lineplot";
import { decodeShare, encodeShare } from "../src/share/shortlink";
import { DEFAULT_VIEW, appShareState, initialAppState } from "../src/defaultview";
import { parseUrlState, serializeUrlState } from "../src/urlstate";
import { checkLinePlotOptions, xTickFit } from "./qplotlib";

const reg = loadRegistry().registry;
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });
beforeEach(() => mem.clear());

async function open(plot?: { get(): string | undefined; set(id: string): void }) {
  document.body.innerHTML = '<aside id="cell-panel"></aside>';
  const root = document.getElementById("cell-panel")!;
  const fx = (fixture as unknown as { cells: { iy: number; ix: number; lat: number; lon: number; hist_idx: number[]; hist_cnt: number[] }[] }).cells[2];
  const hist = new Uint32Array(16384); fx.hist_idx.forEach((k, i) => (hist[k] = fx.hist_cnt[i]));
  const fields = Float32Array.from({ length: FIELD_VARS.length * 64 }, (_, j) => 1e-6 * (1 + (j % 64)) * (1 + Math.floor(j / 64)));
  const c = makeCell({ iy: fx.iy, ix: fx.ix, lat: fx.lat, lon: fx.lon, hist, fields, hasData: true, aux: { series: { qsdiv: Float32Array.from({ length: 64 }, (_, k) => -1e-4 + k * 3e-6) }, scalars: {} } as never });
  const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, plot, exportMeta: () => ({ datasetId: "era5-land", datasetTitle: "ERA5-Land", dataVersion: "v1", permalink: "x" }) });
  await p.show({ query: async () => c, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, c.iy, c.ix);
  return { root, p, sel: root.querySelector("select.qplot-select") as HTMLSelectElement };
}

describe("quantity plot (Earth)", () => {
  it("selector: the layer list's names in its groups, DP by default; directions and divergence included", async () => {
    const { root, sel } = await open();
    const opts = [...sel.querySelectorAll("option")].map((o) => o.value);
    expect(sel.value).toBe(DEFAULT_PLOT);
    for (const id of ["dpm", "rdpm", "rdpa", "qha_rdp_dp", "qsdiv", "at", "ab", "ae", "ao", "qacb", "sige_sigh", "uft"]) expect(opts, id).toContain(id);
    expect([...sel.querySelectorAll("optgroup")].map((g) => g.label)[0]).toBe("Drift potential");
    for (const o of sel.querySelectorAll("option")) {
      const l = reg.layers.find((x) => x.id === (o as HTMLOptionElement).value);
      if (l) expect(o.textContent, l.id).toBe(l.title);
    }
    expect(root.querySelector("#qd-h")!.textContent).toBe("Drift potential DP vs threshold");
    expect(root.querySelector('[data-section="qsdiv"] .caption')!.textContent).toMatch(/^At the current threshold: .*\sm²\/yr\. Drift potential \(DP\) of this cell for every threshold/);
    expect(plotQuantities(FIELD_VARS, []).flatMap((g) => g.items).some((q) => q.id === "qsdiv")).toBe(false);   // no divergence data: not offered
  });
  it("a change follows everywhere (title, axis label, caption, export title and file name) and is stored per body", async () => {
    const set = vi.fn();
    const { root, p, sel } = await open({ get: () => undefined, set });
    sel.value = "rdpa"; sel.dispatchEvent(new Event("change"));
    expect(set).toHaveBeenCalledWith("rdpa");
    expect(mem.get(`duneAtlas.${PLOT_STORAGE}`)).toBe("rdpa");
    expect(root.querySelector("#qd-h")!.textContent).toBe("Resultant drift direction RDD vs threshold");
    const svg = root.querySelector('[data-section="qsdiv"] svg.line-plot')!.outerHTML;
    expect(svg).toContain(">360</text>");
    expect(root.querySelector('[data-section="qsdiv"] .caption')!.textContent).toMatch(/Compass bearing toward which sand moves \(0–360°\)/);
    const x = p.plotExport("qsdiv")!;
    expect(x.name("png")).toMatch(/^dune-atlas_rdd-vs-threshold_era5-land_.*_ut0\.15\.png$/);
    expect(p.plotSpec("qsdiv")!.title).toBe("Resultant drift direction $RDD$ vs threshold friction velocity $u_{*,th}$");
    // a new panel opens on the stored choice
    const again = await open();
    expect(again.sel.value).toBe("rdpa");
    // the app state wins over the stored choice
    const st = await open({ get: () => "qsdiv", set: () => {} });
    expect(st.sel.value).toBe("qsdiv");
    expect(st.root.querySelector("#qd-h")!.textContent).toMatch(/^Saturated flux divergence .* vs threshold$/);
  });
  it("share links: plot carried in #v= (flag 32) and ?plot=; old links decode to the default; default view code unchanged", () => {
    const st = initialAppState(reg, { ...parseUrlState("?lon=1&lat=2&plot=qacb") }, "era5-land");
    expect(st.plotY).toBe("qacb");
    const share = appShareState(st, { lon: 1, lat: 2, zoom: 3 }, true);
    expect(share.plotY).toBe("qacb");
    expect(decodeShare(encodeShare(share))!.plotY).toBe("qacb");
    expect(decodeShare(encodeShare({ ...share, plotY: undefined }))!.plotY).toBeUndefined();
    expect(appShareState({ ...st, plotY: "dpm" }, { lon: 1, lat: 2, zoom: 3 }, true).plotY).toBeUndefined();
    expect(encodeShare(DEFAULT_VIEW)).toBe(encodeShare({ ...DEFAULT_VIEW, plotY: undefined }));
    expect(serializeUrlState({ plot: "ab" })).toBe("?plot=ab");
  });
  it("axes: direction range with wrap breaks, sentinels marked and outside the autoscale, log DP; last x label not clipped", () => {
    checkLinePlotOptions(Array.from(C.UT_VALUES));
    const fit = xTickFit(linePlotSvg({ x: C.UT_VALUES, y: C.UT_VALUES.map((u) => u), currentIndex: 14, xLabel: "u", yLabel: "y", title: "t" }));
    expect(fit.map((t) => t.label)).toEqual(["0.1", "0.2", "0.3", "0.4", "0.5", "0.6"]);
    expect(fit.every((t) => t.ok)).toBe(true);
  });
});
