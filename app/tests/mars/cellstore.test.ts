// Mars cell store against the local fixture (scripts/mars/app/make_fixture.py -> staging/fixture-mars;
// skipped when absent, e.g. CI). Mirrors tests/cellstore.test.ts. Later the same checks apply to
// staging/mars/devroot (the wind data stores): set MARS_STORE_ROOT to that dataset directory.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MarsCellStore } from "../../src/bodies/mars/cell/cellstore";
import { fieldValue } from "../../src/core/cell/cellstore";
import { snapToCell } from "../../src/core/cell/snap";
import { analyseMarsCell } from "../../src/bodies/mars/cell/analysis";
import { EXAMPLE_CELL, MARS_GRID } from "../../src/bodies/mars/body";
import { M } from "../../src/bodies/mars/marsphysics";
import { FIELD_VARS, FIXTURE_DS, RangeFileStore } from "./helpers";

const DS = process.env.MARS_STORE_ROOT ?? FIXTURE_DS;
const have = fs.existsSync(path.join(DS, "cells.zarr", "zarr.json"));

describe.skipIf(!have)(`MarsCellStore on ${path.relative(process.cwd(), DS)}`, () => {
  it("root attrs follow the data contract", async () => {
    const s = await MarsCellStore.open(new RangeFileStore(path.join(DS, "cells.zarr")));
    expect(s.attrs.grid).toMatchObject({ lat0: 89, dlat: -2, lon0: -179, dlon: 2, ny: 90, nx: 180, cell_registration: "centre" });
    expect(s.grid).toEqual(MARS_GRID);
    expect(s.attrs.body).toBe("mars");
    expect(s.attrs.dataset?.id).toBe("fv3-beta1");
    expect(s.fieldVars).toEqual(FIELD_VARS);
    expect(s.attrs.d_values_um).toEqual(M.D_VALUES_UM);
    expect(s.attrs.d_default_index).toBe(29);
    expect(s.attrs.series_vars).toEqual(["u", "v", "T", "rho", "z"]);
    expect(s.attrs.series_units?.z).toBe("m");
    expect(s.nHours).toBe(16032);
  });
  it("the tour cell (Nili Patera): series, fields, dunes, aux; flat-rose total = stored DP", async () => {
    const s = await MarsCellStore.open(new RangeFileStore(path.join(DS, "cells.zarr")), { aux: new RangeFileStore(path.join(DS, "cells-aux.zarr")) });
    const c = snapToCell(EXAMPLE_CELL.lon, EXAMPLE_CELL.lat, s.grid)!;
    const cell = await s.query(c.iy, c.ix);
    expect(cell.hasData).toBe(true);
    expect(cell.totalHours).toBe(16032);
    expect(cell.series.u.length).toBe(16032);
    expect(cell.ls.length).toBe(16032);
    const zs = Array.from(cell.series.z).filter(Number.isFinite);
    expect(Math.min(...zs)).toBeGreaterThan(1.0); // lowest-level height, ~1.6-2.4 m (spec section 2)
    expect(Math.max(...zs)).toBeLessThan(4.0);
    expect(cell.dune).toBe(cell.duneFrac > 0);
    expect(cell.aux?.series.qsdiv?.length).toBe(64);
    expect(Number.isFinite(cell.aux?.scalars.rho_mean)).toBe(true);
    for (const k of [0, 29, 63]) {
      const v = analyseMarsCell(cell, k, { fluxSectors: 32 });
      const dp = fieldValue(cell, "dpm", k) * M.S2Y;
      // fixture: fields from the stored (rounded) series; a real store computes them before the series
      // bit-rounding, so the panel's rose total may differ by the rounding effect (< 5e-4 relative)
      expect(Math.abs(v.fluxTotal / dp - 1), `d index ${k}`).toBeLessThan(process.env.MARS_STORE_ROOT ? 5e-4 : 1e-5);
      expect(v.drift.dp).toBeCloseTo(dp, 9);
      expect(Math.abs(v.stats.fracAbove - fieldValue(cell, "uft", k))).toBeLessThan(process.env.MARS_STORE_ROOT ? 2e-3 : 1e-6);
    }
    t0 = performance.now(); analyseMarsCell(cell, 30, { fluxSectors: 32 }); const ms = performance.now() - t0;
    expect(ms).toBeLessThan(200); // one slider step on a full year
  });
});
let t0 = 0;
