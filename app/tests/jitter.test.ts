// @vitest-environment happy-dom
// Slider jitter (PI round 5 item 2): sweeping the u*,th slider over all 64 positions must not change the
// layout of the layer panel or the cell panel. happy-dom has no layout engine, so the test checks the
// invariant that makes the layout constant (ui/livenum.ts): (1) outside the live-number slots, the text and
// element structure of both panels is identical at every position; (2) every live value fits its slot
// (estimated width <= reserved min-width) and the slot widths do not change; (3) slider readouts keep their
// character count (figure-space padding). SVG figures are fixed-size boxes and are excluded.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import fixture from "./fixtures/flux-parity.json";
import { loadRegistry } from "../src/registry/load";
import { Store, type AppState } from "../src/store";
import { renderLayerPanel } from "../src/ui/layerPanel";
import { CellPanel } from "../src/ui/cellPanel";
import type { CellData, CellStore } from "../src/cell/cellstore";
import { measuredWidthCh, reserveCh, setMeasurer } from "../src/ui/livenum";
import { fakeMeasure, holes, sweep, sweepFields } from "./jitterlib";
import { makeCell, FIELD_VARS } from "./helpers";

const reg = loadRegistry().registry;
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });

function cell(): CellData {
  const c = (fixture as unknown as { cells: { iy: number; ix: number; lat: number; lon: number; hist_idx: number[]; hist_cnt: number[] }[] }).cells[2];
  const hist = new Uint32Array(16384); c.hist_idx.forEach((k, i) => (hist[k] = c.hist_cnt[i]));
  const qsdiv = Float32Array.from({ length: 64 }, (_, k) => (k % 9 === 0 ? NaN : (-1) ** k * 10 ** (-7 + k / 9)));
  return makeCell({ iy: c.iy, ix: c.ix, lat: c.lat, lon: c.lon, hist, fields: sweepFields(FIELD_VARS.length), hasData: true,
    aux: { series: { qsdiv }, scalars: { ai_mean: 0.05, ai_valid_frac: 1, ai_sat_frac: 0, tot_cov_mean: 20.3, tot_cov_valid_frac: 1 } } as never });
}

describe("slider jitter (Earth): layer panel and cell panel keep their layout over all 64 u*,th positions", () => {
  it.each([["estimated", null], ["measured", fakeMeasure]] as const)("text outside the live slots is constant; every live value fits its reserved slot (%s slot widths)", async (_mode, measure) => {
    setMeasurer(measure);
    document.body.innerHTML = '<aside id="layer-panel"></aside><aside id="cell-panel"></aside>';
    const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])), order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false };
    const store = new Store(st);
    const lp = document.getElementById("layer-panel")!, cp = document.getElementById("cell-panel")!;
    renderLayerPanel(lp, reg, store);
    for (const d of lp.querySelectorAll("details")) (d as HTMLDetailsElement).open = true;
    const c = cell();
    const p = new CellPanel(cp, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, threshold: { def: reg.threshold, store } });
    store.subscribe((s, ch) => { if (ch.has("utIndex")) p.setThreshold(s.utIndex); });
    await p.show({ query: async () => c, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, c.iy, c.ix);
    const r = await sweep(store, [lp, cp], reg.threshold.values.length);
    expect(reg.threshold.values.length).toBe(64);
    expect(r.overflow).toEqual([]);
    expect(r.sigs.size).toBe(1);
    expect(holes([lp, cp])).toEqual([]);   // review U8 / L11: no reserved room in the middle of running text
    expect(r.slots).toBeGreaterThan(30);   // readouts, meta, legend, DP/RDP/RDD, caption, heading, table values
    // tabular figures on both panels and the slots (style.css)
    const css = fs.readFileSync(path.resolve(__dirname, "../src/style.css"), "utf8");
    expect(css).toMatch(/#layer-panel, #cell-panel, \.legend \{ font-variant-numeric: tabular-nums; \}/);
    expect(css).toMatch(/\.live-num \{ display: inline-block; white-space: nowrap;[^}]*tabular-nums/);
    setMeasurer(undefined);
  }, 120_000); // 64-position sweep: ~5 s locally, over 20 s on a 2-core CI runner with the full suite
  it("measured slot widths are tight: the widest value plus at most 0.3 ch (review U8 / L11)", () => {
    setMeasurer(fakeMeasure);
    const vals = ["31.4&nbsp;m²/yr", "8.76&nbsp;m²/yr", "112&nbsp;m²/yr"];
    const w = reserveCh(vals), widest = Math.max(...vals.map((v) => measuredWidthCh(v)));
    expect(w).toBeGreaterThanOrEqual(widest);
    expect(w - widest).toBeLessThanOrEqual(0.3);
    setMeasurer(null);
    expect(reserveCh(vals)).toBeGreaterThan(w);   // the conservative estimate (no canvas) is wider
    setMeasurer(undefined);
  });
});
