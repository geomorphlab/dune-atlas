// 'Dunes only' streamlines (integrate unmasked, clip to the dune cells) and base-anchored arrows (PI round 6), Earth.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadDuneMask } from "../src/map/dunemask";
import { checkArrowAnchoring, checkStreamlineClipping, readLevel0, syntheticDir, syntheticMask } from "./vectorcliplib";
import { RangeFileStore } from "./mars/helpers";

const FIX = process.env.EARTH_FIXTURE_ROOT ?? path.resolve(__dirname, "../../staging/fixture");
// ERA5-Land fixture: global cells.zarr (dunes) + a regional 0.1° subset of the field pyramids (fields/at.zarr has data;
// the ERA5 fixture pyramids are metadata only)
const haveFix = fs.existsSync(path.join(FIX, "cells.zarr/dunes/zarr.json")) && fs.existsSync(path.join(FIX, "fields/at.zarr/zarr.json"));

describe("Dunes only streamlines and arrow anchoring (Earth)", () => {
  it("synthetic 0.25° field: clipped pieces inside dune cells, >= the masked-integration lines; toggle off unchanged", () => {
    const m = syntheticMask(721, 1440, 90, -180, 0.25);
    const r = checkStreamlineClipping(syntheticDir(m), m, [10, -30, 40, -5], 24);
    expect(r.clipped).toBeGreaterThan(0);
  });
  it("arrows: tail at the sample point (mid latitudes and polar seeds), tails only in dune cells with the toggle on", () => {
    const m = syntheticMask(721, 1440, 90, -180, 0.25);
    checkArrowAnchoring(syntheticDir(m), null);
    checkArrowAnchoring(syntheticDir(m), m);
  });
  it.skipIf(!haveFix)("ERA5-Land fixture at (alpha_T) at index 14 with cells.zarr dunes", async () => {
    const m = (await loadDuneMask("file://era5land-fixture-vec", new RangeFileStore(path.join(FIX, "cells.zarr"))))!;
    const dir = await readLevel0(new RangeFileStore(path.join(FIX, "fields/at.zarr")), "at", 14, m);
    // the fixture is a spatial subset: a 12° x 8° view centred on the first dune cell with data
    const k = Array.from(dir.data).findIndex((v, i) => Number.isFinite(v) && m.data[Math.round((dir.lat0 + Math.floor(i / dir.nx) * dir.dlat - m.grid.lat0) / m.grid.dlat) * m.nx + Math.round((dir.lon0 + (i % dir.nx) * dir.dlon - m.grid.lon0) / m.grid.dlon)] === 1);
    expect(k).toBeGreaterThanOrEqual(0);
    const lon = dir.lon0 + (k % dir.nx) * dir.dlon, lat = dir.lat0 + Math.floor(k / dir.nx) * dir.dlat;
    const r = checkStreamlineClipping(dir, m, [lon - 6, lat - 4, lon + 6, lat + 4], 40);
    console.log(`[vectorclip] ERA5-Land fixture at ${lon}, ${lat}: all ${r.all}, clipped ${r.clipped}, masked-integration ${r.masked}`);
    expect(r.all).toBeGreaterThan(0);
    checkArrowAnchoring(dir, m);
  });
});
