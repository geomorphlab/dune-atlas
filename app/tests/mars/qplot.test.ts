// @vitest-environment happy-dom
// Mars "<quantity> vs grain diameter" plot: same features as Earth, x = log10 d; the
// last x label (1000) fits; the per-hour median threshold is offered.
import { describe, expect, it, vi } from "vitest";
import { CellPanel } from "../../src/bodies/mars/cellPanel";
import type { MarsCellStore } from "../../src/bodies/mars/cell/cellstore";
import { makeMarsCell } from "./helpers";
import { DEFAULT_PLOT, PLOT_STORAGE } from "../../src/core/cell/qplot";
import { linePlotSvg } from "../../src/core/cell/lineplot";
import { checkLinePlotOptions, xTickFit } from "../qplotlib";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });

describe("quantity plot (Mars)", () => {
  it("DP by default vs grain diameter; median threshold offered; choice stored under the Mars key; export name", async () => {
    document.body.innerHTML = '<aside id="cell-panel"></aside>';
    const root = document.getElementById("cell-panel")!;
    const c = makeMarsCell(0);
    const p = new CellPanel(root, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {} });
    await p.show({ query: async () => c, attrs: { grid: c.grid }, grid: c.grid } as unknown as MarsCellStore, c.iy, c.ix);
    const sel = root.querySelector("select.qplot-select") as HTMLSelectElement;
    expect(sel.value).toBe(DEFAULT_PLOT);
    expect(root.querySelector("#qd-h")!.textContent).toBe("Drift potential DP vs grain diameter");
    expect([...sel.options].map((o) => o.value)).toContain("ut_median");
    sel.value = "ut_median"; sel.dispatchEvent(new Event("change"));
    expect(mem.get(`duneAtlasMars.${PLOT_STORAGE}`)).toBe("ut_median");
    expect(root.querySelector('[data-section="qsdiv"] .caption')!.textContent).toMatch(/^At the current grain diameter: \d\.\d{3}\sm\/s\. Median threshold friction velocity/);
    expect(p.plotExport("qsdiv")!.name("png")).toMatch(/ut-median-vs-grain-diameter/);
  });
  it("axes as Earth; the last x tick label (1000 µm) fits inside the plot", () => {
    const x = [50, 100, 200, 500, 1000].map(Math.log10);
    checkLinePlotOptions(Array.from({ length: 64 }, (_, k) => Math.log10(50) + (k / 63) * (Math.log10(1000) - Math.log10(50))));
    const fit = xTickFit(linePlotSvg({ x, y: [1, 2, 3, 4, 5], currentIndex: 2, xLabel: "d", yLabel: "y", title: "t" }));
    expect(fit.map((t) => t.label)).toEqual(["50", "100", "200", "500", "1000"]);
    expect(fit.every((t) => t.ok), JSON.stringify(fit)).toBe(true);
  });
});
