// Esri OnMars basemaps: registry entries and attributions, and graceful failure of the esri-mars://
// protocol (failing fetches, HTTP errors, non-image bodies, a changed tiling scheme, unknown services,
// cancelled tiles), sparse HiRISE coverage (empty quadtree skipped), the protocol registered with MapLibre.
// Node has no OffscreenCanvas / createImageBitmap: a fake canvas records what is drawn.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handlers: Record<string, (p: { url: string }, a: AbortController) => Promise<{ data: unknown }>> = {};
vi.mock("maplibre-gl", () => ({ default: { addProtocol: (name: string, fn: (typeof handlers)[string]) => { handlers[name] = fn; } } }));

import { loadRegistry } from "../../src/registry/load";
import { HELP_SECTIONS } from "../../src/ui/helpText";
import { prepareMarsBasemaps } from "../../src/mars/map/basemaps";
import { ensureEsriProtocol, ESRI_SERVICES, ESRI_STATS, esriTile, resetEsri, tilingMismatch, type EsriEnv } from "../../src/mars/map/esri";

interface FakeImg { width: number; height: number; opaque: boolean; close: () => void }
interface FakeOut { width: number; height: number; draws: number; opaque: boolean }
const DESC = (o: Partial<{ x: number; rows: number; wkid: number }> = {}) => ({
  tileInfo: { rows: o.rows ?? 512, cols: 512, origin: { x: o.x ?? -180, y: 90 }, spatialReference: { wkid: o.wkid ?? 104971 },
    lods: Array.from({ length: 18 }, (_, l) => ({ level: l, resolution: 0.3515625 / 2 ** l })) },
});

/** fake environment: `tile(url)` decides each source response */
function fakeEnv(tile: (url: string) => Promise<Response> | Response, desc: (s: string) => Promise<Response> | Response = () => Response.json(DESC())) {
  const calls: string[] = [], warnings: string[] = [];
  const canvas = (w: number, h: number) => {
    let draws = 0, opaque = false;
    return {
      getContext: () => ({
        imageSmoothingEnabled: false,
        drawImage: (im: FakeImg | object) => { draws++; if ((im as FakeImg).opaque !== false) opaque = true; },
        getImageData: (_x: number, _y: number, ww: number, hh: number) => ({ data: new Uint8ClampedArray(ww * hh * 4).fill(opaque ? 255 : 0) }),
      }),
      transferToImageBitmap: () => ({ width: w, height: h, draws, opaque }) as unknown as ImageBitmap,
    };
  };
  const env: EsriEnv = {
    base: "https://esri.test/OnMars",
    fetch: (async (u: string, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      if (u.includes("?f=json")) return desc(u);
      calls.push(u);
      const sig = init?.signal;
      return Promise.race([tile(u), new Promise<Response>((_, rej) => sig?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")), { once: true }))]);
    }) as typeof fetch,
    decode: async (b: Blob) => {
      const t = await b.text();
      if (!t.startsWith("IMG")) throw new Error("The source image could not be decoded.");
      return { width: 512, height: 512, opaque: t !== "IMG-transparent", close: () => {} } as unknown as ImageBitmap;
    },
    canvas,
    warn: (m) => { warnings.push(m); },
  };
  return { env, calls, warnings };
}
const img = (body = "IMG") => new Response(body, { status: 200, headers: { "content-type": "image/png" } });
const signal = () => new AbortController().signal;
const out = (x: unknown) => x as FakeOut;

beforeEach(() => resetEsri());
afterEach(() => vi.unstubAllGlobals());

describe("Esri Mars basemaps in the registry", () => {
  const reg = loadRegistry().registry;
  it("CTX1, HiRISE, MDIM and MColorDEM are normal basemaps; the hillshade stays the opening basemap", () => {
    const ids = reg.basemaps.map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["hrsc-mola-hillshade", "esri-ctx1", "esri-hirise", "esri-mdim", "esri-mcolordem"]));
    expect(reg.basemaps.filter((b) => b.default).map((b) => b.id)).toEqual(["hrsc-mola-hillshade"]);
    expect(ids).not.toContain("esri-ctx"); // CTX beta01 left out
    for (const [id, svc] of [["esri-ctx1", "CTX1"], ["esri-hirise", "HiRISE"], ["esri-mdim", "MDIM"], ["esri-mcolordem", "MColorDEM"]] as const) {
      const b = reg.basemaps.find((x) => x.id === id)!;
      expect(b.tiles, id).toEqual([`esri-mars://${svc}/{z}/{x}/{y}`]);
      expect(b.tileSize).toBe(512);
      expect(b.maxzoom, id).toBe(ESRI_SERVICES[svc].maxLevel + 1);
      expect(b.attribution, id).toContain(`item.html?id=${ESRI_SERVICES[svc].item}`);
      expect(b.attribution, id).toMatch(/· <a [^>]+>Esri<\/a>$/);
    }
    const att = (id: string) => reg.basemaps.find((b) => b.id === id)!.attribution!;
    expect(att("esri-ctx1")).toContain("NASA/JPL/MSSS/The Murray Lab");
    expect(att("esri-hirise")).toContain("NASA/JPL/University of Arizona/USGS");
    expect(att("esri-mdim")).toContain("USGS Astrogeology / NASA / JPL ·");
    expect(att("esri-mcolordem")).toContain("USGS Astrogeology / NASA / JPL / ESA / DLR");
    expect(att("esri-mcolordem")).toContain("MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)");
    expect(JSON.stringify(reg.basemaps)).not.toMatch(/prototype/i);
  });
  it("the help explains the basemaps and HiRISE's partial coverage (dark elsewhere), without implementation detail", () => {
    const h = HELP_SECTIONS.find((x) => x.id === "basemaps")!;
    expect(h.body).toMatch(/CTX/);
    expect(h.body).toMatch(/HiRISE covers only the small part of the surface it has imaged; elsewhere the map is dark/);
    expect(h.body).toMatch(/MDIM 2\.1/);
    expect(h.body).not.toMatch(/respond|browser|tiled|served with/);
  });
  it("the protocol is registered when Esri basemaps are listed; without canvas support they are left out", () => {
    const register = vi.fn();
    expect(prepareMarsBasemaps(reg.basemaps, "http://x/", { reproject: true, register }).filter((b) => b.id.startsWith("esri-")).length).toBe(4);
    expect(register).toHaveBeenCalledTimes(1);
    const none = prepareMarsBasemaps(reg.basemaps, "http://x/", { reproject: false, register });
    expect(none.some((b) => b.id.startsWith("esri-"))).toBe(false);
    expect(none.find((b) => b.default)?.id).toBe("hrsc-mola-hillshade");
    expect(register).toHaveBeenCalledTimes(1);
  });
});

describe("esri-mars:// graceful failure", () => {
  it("a failing fetch (network / CORS-less HTTP error) gives a transparent tile, no rejection, other services unaffected", async () => {
    const { env, calls, warnings } = fakeEnv((u) => (u.includes("/CTX1/") ? Promise.reject(new TypeError("Failed to fetch")) : img()));
    const t = out(await esriTile("esri-mars://CTX1/5/20/15", signal(), env));
    expect(t).toMatchObject({ width: 512, height: 512, draws: 0 });
    expect(calls.some((u) => u.includes("/CTX1/MapServer/tile/"))).toBe(true);
    const m = out(await esriTile("esri-mars://MDIM/5/20/15", signal(), env));
    expect(m.draws).toBe(512); // one strip per output row
    expect(m.opaque).toBe(true);
    expect(ESRI_STATS.emptyTiles).toBe(1);
    expect(warnings).toEqual([]); // missing source tiles are expected, not warned
  });

  it("HTTP 500, an HTML error page and a JSON body with status 200 all give transparent tiles", async () => {
    const bodies = [new Response("err", { status: 500 }), new Response("<html>", { status: 400, headers: { "content-type": "text/html" } }), Response.json({ error: { code: 500 } })];
    for (const [k, r] of bodies.entries()) {
      resetEsri();
      const { env } = fakeEnv(() => r.clone());
      const t = out(await esriTile(`esri-mars://MDIM/${3 + k}/2/3`, signal(), env));
      expect(t.draws, `case ${k}`).toBe(0);
    }
  });

  it("a changed tiling scheme disables the service (one warning, no tile requests); an unreadable description does not", async () => {
    for (const bad of [DESC({ x: 0 }), DESC({ rows: 256 }), DESC({ wkid: 4326 }), { error: { message: "Service not found" } }]) expect(tilingMismatch(bad, 12)).not.toBeNull();
    expect(tilingMismatch(DESC(), 17)).toBeNull();
    const a = fakeEnv(() => img(), () => Response.json(DESC({ x: 0 })));
    for (const u of ["esri-mars://CTX1/6/40/30", "esri-mars://CTX1/6/41/30"]) expect(out(await esriTile(u, signal(), a.env)).draws).toBe(0);
    expect(a.calls).toEqual([]);
    expect(a.warnings.length).toBe(1);
    expect(a.warnings[0]).toMatch(/CTX1: tiling scheme changed/);
    resetEsri();
    const b = fakeEnv(() => img(), () => Promise.reject(new TypeError("Failed to fetch")));
    expect(out(await esriTile("esri-mars://CTX1/6/40/30", signal(), b.env)).draws).toBe(512);
    expect(b.warnings.length).toBe(1);
  });

  it("an unknown service or a malformed URL gives a transparent tile and one warning", async () => {
    const { env, warnings } = fakeEnv(() => img());
    expect(out(await esriTile("esri-mars://CTX/3/1/1", signal(), env)).draws).toBe(0);
    expect(out(await esriTile("esri-mars://CTX/3/1/2", signal(), env)).draws).toBe(0);
    expect(out(await esriTile("esri-mars://nonsense", signal(), env)).draws).toBe(0);
    expect(warnings.length).toBe(2);
  });

  it("a cancelled tile rejects with an AbortError (MapLibre ignores it) and aborts its source requests", async () => {
    let pending: ((r: Response) => void) | null = null;
    const { env } = fakeEnv(() => new Promise<Response>((res) => { pending = res; }));
    const ctl = new AbortController();
    const p = esriTile("esri-mars://MDIM/4/8/5", ctl.signal, env);
    await new Promise((r) => setTimeout(r, 0));
    ctl.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(ESRI_STATS.aborted).toBeGreaterThan(0);
    (pending as ((r: Response) => void) | null)?.(img());
  });
});

describe("HiRISE sparse coverage", () => {
  it("transparent / 404 source tiles render as background and their quadtree below sends no requests", async () => {
    const { env, calls } = fakeEnv((u) => (u.includes("/tile/3/") ? img("IMG-transparent") : new Response("", { status: 404 })));
    const t3 = out(await esriTile("esri-mars://HiRISE/4/4/7", signal(), env)); // Esri level 3 near the equator
    expect(t3.opaque).toBe(false);
    const n = calls.length;
    expect(n).toBeGreaterThan(0);
    // zoom in inside that tile: every source tile is a descendant of an empty one -> no requests
    const t7 = out(await esriTile("esri-mars://HiRISE/8/64/112", signal(), env));
    expect(t7.draws).toBe(0);
    expect(calls.length).toBe(n);
    expect(ESRI_STATS.sourceSkipped).toBeGreaterThan(0);
  });
  it("tiles with data are drawn; a 404 at depth marks only its own quadtree", async () => {
    const { env, calls } = fakeEnv((u) => (/\/tile\/9\/\d+\/1[0-9]{3}$/.test(u) ? new Response("", { status: 404 }) : img()));
    const a = out(await esriTile("esri-mars://HiRISE/10/400/600", signal(), env));
    expect(a.opaque).toBe(true);
    expect(calls.length).toBeGreaterThan(0);
  });
});

describe("the registered MapLibre protocol", () => {
  it("never rejects on a failing fetch (browser globals stubbed)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("NetworkError when attempting to fetch resource."); }));
    vi.stubGlobal("OffscreenCanvas", class { width: number; height: number; constructor(w: number, h: number) { this.width = w; this.height = h; } getContext() { return { drawImage() {}, imageSmoothingEnabled: true }; } transferToImageBitmap() { return { width: this.width, height: this.height, empty: true }; } });
    vi.stubGlobal("createImageBitmap", vi.fn());
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    ensureEsriProtocol();
    expect(typeof handlers["esri-mars"]).toBe("function");
    for (const u of ["esri-mars://CTX1/7/90/60", "esri-mars://HiRISE/12/2700/1800", "esri-mars://MColorDEM/2/1/1"]) {
      const r = await handlers["esri-mars"]({ url: u }, new AbortController());
      expect(r.data).toMatchObject({ width: 512, height: 512, empty: true });
    }
    warn.mockRestore();
  });
});
