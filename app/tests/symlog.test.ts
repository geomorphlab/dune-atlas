import { describe, expect, it } from "vitest";
import { effectiveDisplay, scaleFor, scaleNorm, symlog, symlogCentred, symlogThreshold } from "../src/layerconfig";
import { legendHtml, legendTicks, tickPosition } from "../src/ui/legend";
import { fragmentFor, symlogUniforms } from "../src/map/shader";
import { zarrLayerSource } from "../src/map/adapters";
import { loadRegistry } from "../src/registry/load";
import type { LayerDef } from "../src/registry/types";

const lay = (clim: [number, number], colormap = "piyg"): LayerDef => ({ id: "q", title: "q", group: "g", type: "zarr-field", source: "s", variable: "qsdiv", display: { clim, colormap } });

describe("symmetric log colour scale", () => {
  it("scale selection and automatic linear threshold", () => {
    expect(scaleFor(true, [0.1, 10])).toBe("log");
    expect(scaleFor(true, [-0.3, 0.3])).toBe("symlog");
    expect(scaleFor(true, [0, 1])).toBe("linear");
    expect(scaleFor(false, [-1, 1])).toBe("linear");
    expect(symlogThreshold([-0.3, 0.3])).toBe(0.001);
    expect(symlogThreshold([-1, 0.5])).toBeCloseTo(0.01, 15);
    expect(symlogThreshold([-0.002, 1e-3])).toBeCloseTo(1e-5, 18);
    expect(symlogThreshold([-250, 40])).toBe(1);
  });
  it("transform: odd, ~linear below c, logarithmic above; limits map to colormap ends", () => {
    expect(symlog(0, 1e-3)).toBe(0);
    expect(symlog(-0.05, 1e-3)).toBe(-symlog(0.05, 1e-3));
    expect(symlog(1e-6, 1e-3)).toBeCloseTo(1e-3 / Math.LN10, 6);
    expect(symlog(1, 1e-3)).toBeCloseTo(Math.log10(1001), 12);
    for (const clim of [[-0.3, 0.3], [-0.1, 0.4]] as [number, number][]) for (const cm of ["piyg", "viridis"]) {
      const e = effectiveDisplay(lay(clim, cm), { log: true });
      expect(e.scale).toBe("symlog");
      expect(scaleNorm(e, clim[0])).toBeCloseTo(0, 12);
      expect(scaleNorm(e, clim[1])).toBeCloseTo(1, 12);
      // monotone
      const vs = Array.from({ length: 101 }, (_, i) => clim[0] + ((clim[1] - clim[0]) * i) / 100);
      for (let i = 1; i < vs.length; i++) expect(scaleNorm(e, vs[i])).toBeGreaterThanOrEqual(scaleNorm(e, vs[i - 1]));
    }
  });
  it("0 at the centre when symmetric, or asymmetric with a diverging colormap; otherwise linear in f", () => {
    expect(symlogCentred([-0.3, 0.3], "viridis")).toBe(true);
    expect(symlogCentred([-0.1, 0.4], "piyg")).toBe(true);
    expect(symlogCentred([-0.1, 0.4], "viridis")).toBe(false);
    expect(scaleNorm(effectiveDisplay(lay([-0.1, 0.4], "piyg"), { log: true }), 0)).toBe(0.5);
    const e = effectiveDisplay(lay([-0.1, 0.4], "viridis"), { log: true });
    const c = e.linthresh, f = (v: number) => symlog(v, c);
    expect(scaleNorm(e, 0)).toBeCloseTo((0 - f(-0.1)) / (f(0.4) - f(-0.1)), 12);
    // reversed diverging colormap still centred
    expect(effectiveDisplay(lay([-0.1, 0.4], "rdbu"), { log: true, reverse: true }).centred).toBe(true);
  });
  it("legend: 0, symmetric decades +-c 10^k inside the limits, limits; label symlog; positions follow the transform", () => {
    const l = lay([-0.3, 0.3]);
    const t = legendTicks(l, { log: true });
    expect(t).toEqual([-0.3, -0.1, -0.01, -0.001, 0, 0.001, 0.01, 0.1, 0.3]);
    const e = effectiveDisplay(l, { log: true });
    for (const v of t) expect(tickPosition(l, v, { log: true })).toBeCloseTo(scaleNorm(e, v), 15);
    expect(tickPosition(l, 0, { log: true })).toBe(0.5);
    const html = legendHtml(l, { log: true });
    expect(html).toContain("symlog");
    expect(html).toContain("symmetric logarithmic");
    // crowding: ticks too close to a placed tick are dropped
    const t2 = legendTicks(lay([-0.012, 0.3]), { log: true });
    for (let i = 1; i < t2.length; i++) expect(tickPosition(lay([-0.012, 0.3]), t2[i], { log: true }) - tickPosition(lay([-0.012, 0.3]), t2[i - 1], { log: true })).toBeGreaterThanOrEqual(0.05 - 1e-12);
    expect(t2).toContain(0);
  });
  it("shader: symlog path uses u_linthresh / u_centred uniforms; uniform values follow the limits", () => {
    const frag = fragmentFor("qsdiv", { colourScale: "symlog" })!;
    expect(frag).toContain("u_linthresh");
    expect(frag).toContain("u_centred > 0.5");
    expect(frag).not.toMatch(/uniform /); // declared by zarr-layer from the uniforms option
    expect(fragmentFor("qsdiv", { log: false })).toBeUndefined();
    const e = effectiveDisplay(lay([-0.3, 0.3]), { log: true });
    expect(symlogUniforms(e)).toEqual({ u_linthresh: 0.001, u_centred: 1 });
    const e2 = effectiveDisplay(lay([-2, 0.5], "viridis"), { log: true });
    expect(symlogUniforms(e2)).toEqual({ u_linthresh: 0.01, u_centred: 0 });
  });
  it("shader mapping evaluated on the CPU equals scaleNorm (GPU/CPU agree)", () => {
    // emulate the GLSL expression with natural logs
    const glsl = (v: number, lo: number, hi: number, c: number, centred: boolean) => {
      const f = (x: number) => Math.sign(x) * Math.log(1 + Math.abs(x) / c);
      const n = centred ? (v >= 0 ? 0.5 + (0.5 * f(v)) / f(hi) : 0.5 - (0.5 * f(v)) / f(lo)) : (f(v) - f(lo)) / (f(hi) - f(lo));
      return Math.max(0, Math.min(1, n));
    };
    for (const [clim, cm] of [[[-0.3, 0.3], "piyg"], [[-0.1, 0.4], "viridis"], [[-0.1, 0.4], "brbg"]] as [[number, number], string][]) {
      const e = effectiveDisplay(lay(clim, cm), { log: true });
      for (let i = 0; i <= 50; i++) { const v = clim[0] - 0.05 + ((clim[1] - clim[0] + 0.1) * i) / 50; expect(glsl(v, clim[0], clim[1], e.linthresh, e.centred)).toBeCloseTo(scaleNorm(e, v), 12); }
    }
  });
  it("registry qsdiv: log tick -> symlog layer options carry the uniforms", () => {
    const reg = loadRegistry().registry;
    const q = reg.layers.find((x) => x.id === "qsdiv")!;
    const e = effectiveDisplay(q, { log: true });
    expect(e.scale).toBe("symlog");
    expect(e.centred).toBe(true);
    expect(zarrLayerSource(q, "https://x/q.zarr", null, undefined).renderingMode).toBe("2d");
  });
});
