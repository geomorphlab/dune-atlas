// Cell-query module against the local fixture store (skipped when staging/fixture is absent, e.g. CI).
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CellStore, fieldValue } from "../src/core/cell/cellstore";
import { snapToCell } from "../src/core/cell/snap";
import { analyseCell } from "../src/core/cell/analysis";
import { dpRdpRdd } from "../src/core/cell/flux";
import { C } from "../src/core/util/constants";

const fixture = path.resolve(__dirname, "../../staging/fixture");
const have = fs.existsSync(path.join(fixture, "cells.zarr", "zarr.json"));
const ref = have ? JSON.parse(fs.readFileSync(path.join(fixture, "decode_reference.json"), "utf8")) : null;

class RangeFileStore {
  constructor(private root: string) {}
  async get(key: string) { const p = this.root + key; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
  async getRange(key: string, r: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + key;
    if (!fs.existsSync(p)) return undefined;
    const size = fs.statSync(p).size;
    const [off, len] = "suffixLength" in r ? [size - r.suffixLength, r.suffixLength] : [r.offset, r.length];
    const fd = fs.openSync(p, "r"); const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd);
    return new Uint8Array(b);
  }
}

describe.skipIf(!have)("CellStore on staging/fixture/cells.zarr", () => {
  it("reads the decode-reference cell; field_vars are the atlas fields", async () => {
    const s = await CellStore.open(new RangeFileStore(path.join(fixture, "cells.zarr")));
    expect(s.fieldVars).toEqual(C.QSAT_VARS.filter((v) => !C.WITHHELD_VARS.includes(v)));
    const [iy, ix] = ref.cell;
    const c = snapToCell(-180 + 0.1 * ix, 90 - 0.1 * iy)!;
    const cell = await s.query(c.iy, c.ix);
    expect(cell.totalHours).toBe(ref.hist_sum);
    expect(cell.hasData).toBe(true);
    expect(Math.abs(fieldValue(cell, "qacb", 14) / ref.fields_qacb_ut14 - 1)).toBeLessThan(1e-7);
    expect(fieldValue(cell, "at", 14)).toBeCloseTo(ref.fields_at_ut14, 6);
    // cell-store DP = TS DP from the histogram = sum of flux-rose petals
    const v = analyseCell(cell, 14);
    const tw = dpRdpRdd(cell.hist, C.UT_VALUES[14]);
    expect(Math.abs(fieldValue(cell, "dpm", 14) / tw.dp - 1)).toBeLessThan(1e-6);
    expect(Math.abs(fieldValue(cell, "rdpm", 14) / tw.rdp - 1)).toBeLessThan(1e-6);
    expect(Math.abs(v.fluxSectors.reduce((a, b) => a + b, 0) / v.drift.dp - 1)).toBeLessThan(1e-6);
  });
  it("ocean cell inside a written shard and a cell in an absent shard both report no data", async () => {
    const s = await CellStore.open(new RangeFileStore(path.join(fixture, "cells.zarr")));
    const a = await s.query(1100, 1904); // Atlantic, inside fixture region
    expect(a.hasData).toBe(false);
    const b = await s.query(0, 0); // north pole, outside fixture region (absent shard)
    expect(b.hasData).toBe(false);
    expect(b.totalHours).toBe(0);
  });
});
