// @vitest-environment happy-dom
// What the atlas remembers (core/visit.ts): a new visit opens like a first visit. Language and 'tour seen' stay in
// localStorage; every other choice is kept for the visit only (sessionStorage), panel layout shared by both atlases.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dropRetiredLocal, RETIRED_LOCAL_NAMES, sharedKey, visitFlags, visitGet, visitSet } from "../src/core/visit";
import { otherBodyUrl, storageKeyFor } from "../src/core/body";
import { LANG_KEY } from "../src/i18n";
import { TOUR_SEEN_KEY } from "../src/core/ui/tour";
import { resolveInitialState, DEFAULT_VIEW } from "../src/core/defaultview";

const mk = () => { const m = new Map<string, string>(); return { m, s: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear() } }; };
const local = mk(), session = mk();
vi.stubGlobal("localStorage", local.s);
vi.stubGlobal("sessionStorage", session.s);
beforeEach(() => { local.m.clear(); session.m.clear(); });

describe("visit storage", () => {
  it("settings of earlier versions are removed from localStorage; language and tour flags stay", () => {
    for (const b of ["earth", "mars"] as const) for (const n of RETIRED_LOCAL_NAMES) local.s.setItem(storageKeyFor(b, n), "x");
    local.s.setItem(LANG_KEY, "fr");
    local.s.setItem(TOUR_SEEN_KEY, "1");
    local.s.setItem("duneAtlasMars.tourSeen", "1");
    dropRetiredLocal();
    expect([...local.m.keys()].sort()).toEqual([LANG_KEY, "duneAtlasMars.tourSeen", TOUR_SEEN_KEY].sort());
    expect(local.m.has("duneAtlas.dataset") || local.m.has("duneAtlasMars.cellPanel.modesOpen")).toBe(false);
  });
  it("visit values round-trip; flags ignore non-booleans and bad JSON; no storage is harmless", () => {
    visitSet(sharedKey("layerPanel.groups"), JSON.stringify({ wind: true, drift: false, x: 1 }));
    expect(visitFlags(sharedKey("layerPanel.groups"))).toEqual({ wind: true, drift: false });
    visitSet("k", "{bad");
    expect(visitFlags("k")).toEqual({});
    vi.stubGlobal("sessionStorage", undefined);
    expect(visitGet("k")).toBeNull();
    expect(() => visitSet("k", "1")).not.toThrow();
    vi.stubGlobal("sessionStorage", session.s);
  });
  it("a bare address opens the default view's dataset unless one was chosen in this visit", () => {
    expect(resolveInitialState(null, {}, "era5-land", undefined).dataset).toBe(DEFAULT_VIEW.dataset);
    expect(resolveInitialState(null, {}, "era5-land", "era5-land").dataset).toBe("era5-land");
  });
  it("the planet button carries the language (not English)", () => {
    expect(otherBodyUrl({ body: "earth", base: "/", host: "map.geomorphlab.org", resume: true, lang: "zh-Hans" })).toBe("/mars/?resume=1&lang=zh-Hans");
    expect(otherBodyUrl({ body: "mars", base: "/mars/", host: "map.geomorphlab.org", resume: true })).toBe("/?resume=1");
  });
});
