import { describe, expect, it } from "vitest";
import { parseUrlState, serializeUrlState } from "../src/urlstate";

describe("URL state", () => {
  it("round-trips", () => {
    const s = {
      lon: 15.2, lat: -24.5, zoom: 6.25, basemap: "esri-imagery",
      layers: [
        { id: "dpm", opacity: 0.8, cfg: { colormap: "viridis", reverse: true, clim: [0.5, 300] as [number, number], log: true } },
        { id: "at", cfg: { mode: "streamlines" as const, vecColor: "#ff0000", spacingKm: 200 } },
        { id: "dunes", cfg: { fill: "#112233", invert: true } },
      ],
      ut: 14, cell: [1145, 1952] as [number, number], proj: "mercator" as const, embed: true,
    };
    const q = serializeUrlState(s);
    expect(q).toBe("?lon=15.2000&lat=-24.5000&zoom=6.25&basemap=esri-imagery&layers=dpm:0.8~cm=viridis~rev=1~lo=0.5~hi=300~log=1,at~mode=s~vc=ff0000~km=200,dunes~fc=112233~inv=1&ut=14&cell=1145,1952&proj=mercator&embed=1");
    expect(parseUrlState(q)).toEqual(s);
  });
  it("ignores invalid values", () => {
    expect(parseUrlState("?ut=99&cell=-1,2&lat=95&lon=1&proj=foo&basemap=<x>&layers=ok,b@d&dataset=B@d&order=")).toEqual({ layers: [{ id: "ok" }] });
  });
  it("empty layers param means no overlays; absent means registry defaults", () => {
    expect(parseUrlState("?layers=").layers).toEqual([]);
    expect(parseUrlState("?ut=3").layers).toBeUndefined();
  });
  it("has no reduction or terrain parameter", () => {
    expect(parseUrlState("?reduction=x&terrain=1")).toEqual({});
  });
  it("grid-agnostic cell indices, drawing order and dataset", () => {
    const q = serializeUrlState({ cell: [500, 1300], order: ["dunes", "at", "qacb"], dataset: "era5" });
    expect(q).toBe("?cell=500,1300&order=dunes,at,qacb&dataset=era5");
    expect(parseUrlState(q)).toEqual({ cell: [500, 1300], order: ["dunes", "at", "qacb"], dataset: "era5" });
    expect(parseUrlState("?layers=at~mode=s~km=200").layers).toEqual([{ id: "at", cfg: { mode: "streamlines", spacingKm: 200 } }]);
    // legacy px spacing is kept for migration at the initial view; outline keys are ignored
    expect(parseUrlState("?layers=at~mode=s~ds=40,dunes~lc=445566~ol=0").layers).toEqual([{ id: "at", cfg: { mode: "streamlines", legacyDsepPx: 40 } }, { id: "dunes" }]);
    expect(parseUrlState("?layers=at~km=30").layers).toEqual([{ id: "at" }]); // not a slider step
  });
  it("ignores invalid layer config values", () => {
    expect(parseUrlState("?layers=at~cm=nope~lo=5~hi=1~mode=x~fc=red").layers).toEqual([{ id: "at" }]);
  });
});
