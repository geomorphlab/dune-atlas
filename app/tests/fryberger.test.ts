// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { atlasThresholdSpeed, frybergerFigure, KNOT, readoutHtml, steadyWindDp } from "../src/core/ui/frybergerfig";
import { flatFlux } from "../src/core/cell/flux";
import { C } from "../src/core/util/constants";

describe("atlas DP vs Fryberger DP for a steady wind", () => {
  it("Fryberger DP is V²(V − 12) VU for a wind blowing all the time", () => {
    expect(steadyWindDp(20 * KNOT, 0.15).fry).toBeCloseTo(400 * 8, 6);
    expect(steadyWindDp(11.9 * KNOT, 0.15).fry).toBe(0);
  });
  it("atlas DP is the atlas flat-bed flux in m²/yr and zero below its threshold", () => {
    const u = 10, ut = 0.15;
    const uf = Float64Array.of((u * C.KAPPA) / Math.log(C.Z / C.Z0));
    expect(steadyWindDp(u, ut).atlas).toBeCloseTo(flatFlux(ut, uf)[0] * C.S2Y, 9);
    expect(steadyWindDp(atlasThresholdSpeed(ut) * 0.99, ut).atlas).toBe(0);
  });
  it("the ratio is defined only above both thresholds and changes with speed", () => {
    expect(Number.isNaN(steadyWindDp(5, 0.15).ratio)).toBe(true);
    const r8 = steadyWindDp(8, 0.15).ratio, r16 = steadyWindDp(16, 0.15).ratio;
    expect(r8).toBeGreaterThan(r16 * 2);
  });
  it("figure: slider redraws, pointing reads off values", () => {
    let mapI = 20;
    const fig = frybergerFigure(() => mapI);
    document.body.append(fig);
    const before = fig.querySelector(".fry-plot")!.innerHTML;
    const input = fig.querySelector("input[type=range]") as HTMLInputElement;
    input.value = String(C.UT_VALUES.length - 1); input.dispatchEvent(new Event("input"));
    expect(fig.querySelector(".fry-plot")!.innerHTML).not.toBe(before);
    expect(fig.querySelector("output")!.textContent).toBe(`${C.UT_VALUES[C.UT_VALUES.length - 1].toFixed(2)} m/s`);
    expect(fig.querySelectorAll(".fry-plot path").length).toBeGreaterThanOrEqual(3);
    expect(fig.querySelector("figcaption")!.textContent).toContain("no fixed conversion factor");
    // back to the map's threshold (which may have moved meanwhile)
    mapI = 30;
    (fig.querySelector(".fry-slider button") as HTMLButtonElement).click();
    expect(input.value).toBe("30");
    expect(fig.querySelector("output")!.textContent!.trim()).toBe(`${C.UT_VALUES[30].toFixed(2)} m/s`);
  });
  it("readout: the same four lines and slot widths whatever the values (no reflow)", () => {
    const slots = (html: string) => [...html.matchAll(/min-width:\s*([\d.]+)ch/g)].map((m) => m[1]);
    const strip = (html: string) => html.replace(/<span class="live-num[^>]*>.*?<\/span>/g, "#");
    const a = readoutHtml(null), b = readoutHtml(steadyWindDp(6.2, 0.15)), c = readoutHtml(steadyWindDp(19.9, 0.64));
    expect(slots(a)).toHaveLength(4);
    expect(slots(b)).toEqual(slots(a)); expect(slots(c)).toEqual(slots(a));
    expect(strip(b)).toBe(strip(a)); expect(strip(c)).toBe(strip(a));
  });
});
