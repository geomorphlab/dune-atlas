// Planet button return: each atlas stores its last view per body; the other atlas is opened with
// ?resume=1 and, without view state of its own, reopens that view (camera, basemap, projection, opacities).
import { describe, expect, it } from "vitest";
import { parseUrlState, serializeUrlState } from "../src/core/urlstate";
import { resolveInitialState, resumeQuery, LAST_VIEW } from "../src/core/defaultview";
import { otherBodyUrl, storageKeyFor } from "../src/core/body";

const LAST = "?lon=14.9000&lat=-23.5000&zoom=6.40&basemap=esri-imagery&layers=dpm:0.35,dunes:0.5&ut=20&cell=1135,1950&proj=mercator&dataset=era5&dunesonly=1";

describe("planet switch and back restores the last view of each atlas", () => {
  it("resume=1 with a stored view opens it (embed / tour flags from the link), and drops resume from the address", () => {
    const q = resumeQuery(parseUrlState("?resume=1&embed=1"), LAST);
    expect(q).toMatchObject({ lon: 14.9, lat: -23.5, zoom: 6.4, basemap: "esri-imagery", proj: "mercator", ut: 20, cell: [1135, 1950], dataset: "era5", dunesOnly: true, embed: true });
    expect(q.layers).toEqual([{ id: "dpm", opacity: 0.35 }, { id: "dunes", opacity: 0.5 }]);
    const st = resolveInitialState(null, q, "era5-land", undefined);
    expect(st.source).toBe("query");
    expect(st.url).toMatchObject({ basemap: "esri-imagery", proj: "mercator", zoom: 6.4 });
    expect(serializeUrlState(st.url)).not.toMatch(/resume/);
  });
  it("without resume, with view state of its own, or with nothing stored: unchanged", () => {
    expect(resumeQuery(parseUrlState(""), LAST)).toEqual({});
    expect(resumeQuery(parseUrlState("?resume=1&lon=1&lat=2"), LAST)).toMatchObject({ lon: 1, lat: 2 });
    expect(resumeQuery(parseUrlState("?resume=1"), null)).toEqual({ resume: true });
    expect(resolveInitialState(null, resumeQuery(parseUrlState("?resume=1"), null), "era5-land", undefined).source).toBe("default");
  });
  it("the planet button carries resume=1 (and embed); the stored view key is per body", () => {
    expect(otherBodyUrl({ body: "earth", base: "/", host: "map.geomorphlab.org", resume: true })).toBe("/mars/?resume=1");
    expect(otherBodyUrl({ body: "mars", base: "/mars/", host: "map.geomorphlab.org", resume: true, embed: true })).toBe("/?embed=1&resume=1");
    expect(storageKeyFor("earth", LAST_VIEW)).toBe("duneAtlas.lastView");
    expect(storageKeyFor("mars", LAST_VIEW)).toBe("duneAtlasMars.lastView");
  });
});
