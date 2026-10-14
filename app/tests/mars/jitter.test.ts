// @vitest-environment happy-dom
// Slider jitter on Mars: the grain-size slider over all 64 d values must not change the
// layout of the layer panel or the cell panel (same invariant as tests/jitter.test.ts, tests/jitterlib.ts).
import { describe, expect, it, vi } from "vitest";
import { loadRegistry } from "../../src/registry/load";
import { Store, type AppState } from "../../src/store";
import { renderLayerPanel } from "../../src/ui/layerPanel";
import { CellPanel } from "../../src/bodies/mars/ui/cellPanel";
import type { MarsCellStore } from "../../src/bodies/mars/cell/cellstore";
import { measuredWidthCh, reserveCh, setMeasurer } from "../../src/ui/livenum";
import { fakeMeasure, holes, sweep, sweepFields } from "../jitterlib";
import { makeMarsCell, FIELD_VARS } from "./helpers";

const reg = loadRegistry().registry;
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });

describe("slider jitter (Mars): layer panel and cell panel keep their layout over all 64 grain diameters", () => {
  it.each([["estimated", null], ["measured", fakeMeasure]] as const)("text outside the live slots is constant; every live value fits its reserved slot; readout padded (%s slot widths)", async (_mode, measure) => {
    setMeasurer(measure);
    document.body.innerHTML = '<aside id="layer-panel"></aside><aside id="cell-panel"></aside>';
    const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 29, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])), order: reg.layers.map((l) => l.id), dataset: "fv3-beta1", cell: null, embed: false };
    const store = new Store(st);
    const lp = document.getElementById("layer-panel")!, cp = document.getElementById("cell-panel")!;
    renderLayerPanel(lp, reg, store);
    for (const d of lp.querySelectorAll("details")) (d as HTMLDetailsElement).open = true;
    const base = makeMarsCell(0);
    const qsdiv = Float32Array.from({ length: 64 }, (_, k) => (k % 9 === 0 ? NaN : (-1) ** k * 10 ** (-7 + k / 9)));
    const c = { ...base, fields: sweepFields(FIELD_VARS.length), aux: { ...(base.aux ?? { scalars: {} }), series: { qsdiv } } } as typeof base;
    const p = new CellPanel(cp, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {}, threshold: { def: reg.threshold, store } });
    store.subscribe((s, ch) => { if (ch.has("utIndex")) p.setThreshold(s.utIndex); });
    await p.show({ query: async () => c, attrs: { grid: c.grid, field_vars: FIELD_VARS }, grid: c.grid } as unknown as MarsCellStore, c.iy, c.ix);
    expect(reg.threshold.values.length).toBe(64);
    const r = await sweep(store, [lp, cp], 64);
    expect(r.overflow).toEqual([]);
    expect(r.sigs.size).toBe(1);
    expect(holes([lp, cp])).toEqual([]);   // no reserved room in the middle of running text
    expect(r.slots).toBeGreaterThan(30);
    // the readout keeps its character count: " 50 µm" ... "1000 µm" (leading figure spaces)
    const out = lp.querySelector("output.ut-value")!;
    store.set({ utIndex: 0 }); const a = out.textContent!;
    store.set({ utIndex: 63 }); const b = out.textContent!;
    expect([...a].length).toBe([...b].length);
    expect(a).toMatch(/^\u2007+50 µm$/); expect(b).toBe("1000 µm");
    setMeasurer(undefined);
  }, 120_000); // full 64-position sweep (FULL_SWEEP=1): ~5 s locally, over 20 s on a 2-core CI runner
  it("measured slot widths are tight: the widest value plus at most 0.3 ch", () => {
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
