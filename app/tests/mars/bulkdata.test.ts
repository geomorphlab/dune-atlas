// @vitest-environment happy-dom
// Mars "Get the whole grid": URLs of the MCMC FV3 stores, the grain-diameter axis d, the Mars example box.
import { describe, expect, it } from "vitest";
import { bulkGuide, bulkGuideHtml } from "../../src/core/ui/bulkguide";

describe("Mars bulk-data guide", () => {
  it("stores, axis and licence of the Mars dataset (registry)", () => {
    const g = bulkGuide("fv3-beta1");
    expect(g.fields.find((f) => f.variable === "dpm")!.url).toBe("https://data.geomorphlab.org/dune-atlas/mars/v2/datasets/fv3-beta1/fields/dpm.zarr/0");
    expect(g.cellStore).toBe("https://data.geomorphlab.org/dune-atlas/mars/v2/datasets/fv3-beta1/cells.zarr");
    expect(g.code).toContain('("dpm", "d", "y", "x")');
    expect(g.code).toContain("- 200).argmin()");
    expect(g.code).toContain("the whole grid at d = 200 µm");
    expect(g.code).toContain("sel(y=slice(11, 7), x=slice(65, 69))");   // around the example cell (Nili Patera)
    const d = document.createElement("div"); d.innerHTML = bulkGuideHtml("fv3-beta1");
    expect(d.textContent).toContain("median grain diameter (d, 64 values)");
  });
});
