// 'Dunes only' streamlines (integrate unmasked, clip to the dune cells) and base-anchored arrows, Mars:
// synthetic 2° field, and the fixture (or MARS_STORE_ROOT devroot) rdpa with cells.zarr/dune.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadDuneMask } from "../../src/map/dunemask";
import { checkArrowAnchoring, checkStreamlineClipping, readLevel0, syntheticDir, syntheticMask } from "../vectorcliplib";
import { FIXTURE_DS, RangeFileStore, haveFixture } from "./helpers";

const DS = process.env.MARS_STORE_ROOT ?? FIXTURE_DS;
const have = (process.env.MARS_STORE_ROOT ? fs.existsSync(path.join(DS, "cells.zarr/zarr.json")) : haveFixture) && fs.existsSync(path.join(DS, "fields/rdpa.zarr/zarr.json"));

describe("Dunes only streamlines and arrow anchoring (Mars)", () => {
  it("synthetic 2° field: clipped pieces inside dune cells, >= the masked-integration lines; toggle off unchanged", () => {
    const m = syntheticMask(90, 180, 89, -179, 2);
    const r = checkStreamlineClipping(syntheticDir(m), m, [-180, -60, 180, 60], 4);
    expect(r.clipped).toBeGreaterThan(0);
  });
  it("arrows: tail at the sample point (mid latitudes and polar seeds), tails only in dune cells with the toggle on", () => {
    const m = syntheticMask(90, 180, 89, -179, 2);
    checkArrowAnchoring(syntheticDir(m), null);
    checkArrowAnchoring(syntheticDir(m), m);
  });
  it.skipIf(!have)("fixture / devroot rdpa (d index 29) with cells.zarr/dune: clipping and anchoring", async () => {
    const m = (await loadDuneMask(`file://${DS}-vec`, new RangeFileStore(path.join(DS, "cells.zarr"))))!;
    const dir = await readLevel0(new RangeFileStore(path.join(DS, "fields/rdpa.zarr")), "rdpa", 29, m);
    const r = checkStreamlineClipping(dir, m, [-180, -70, 180, 70], 4);
    if (process.env.MARS_STORE_ROOT) { expect(r.clipped).toBeGreaterThan(r.masked); expect(m.count).toBe(2749); }
    console.log(`[vectorclip] ${process.env.MARS_STORE_ROOT ? "devroot" : "fixture"}: all ${r.all}, clipped ${r.clipped}, masked-integration ${r.masked}`);
    checkArrowAnchoring(dir, m);
  });
});
