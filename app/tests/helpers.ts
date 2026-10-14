// Shared test helpers.
import type { CellData } from "../src/core/cell/cellstore";
import { DEFAULT_BINS } from "../src/core/cell/flux";
import { ERA5_LAND_GRID } from "../src/core/cell/snap";
import { C } from "../src/core/util/constants";

export const FIELD_VARS = C.QSAT_VARS.filter((v) => !C.WITHHELD_VARS.includes(v)); // as in the cell store

export function makeCell(o: Partial<CellData> & Pick<CellData, "iy" | "ix" | "lat" | "lon" | "hist" | "fields">): CellData {
  const fieldVars = o.fieldVars ?? FIELD_VARS;
  return {
    id: o.iy * 3600 + o.ix, fieldVars, dune: true, hasData: true,
    totalHours: Array.from(o.hist).reduce((a, b) => a + b, 0),
    bins: DEFAULT_BINS, utValues: C.UT_VALUES, grid: ERA5_LAND_GRID,
    ...o,
  };
}
