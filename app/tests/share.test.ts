// Short share links (#v=…): round trips for many random states, stable id tables, length of
// typical links, and the old ?query permalinks still parse.
import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare, shareFromHash, shareToUrlState, shareUrl, SHARE_IDS, type ShareState } from "../src/core/share/shortlink";
import { loadRegistry } from "../src/core/registry/load";
import { COLORMAPS } from "../src/core/util/colormaps";
import { SPACING_KM_STEPS, type LayerConfig } from "../src/core/layerconfig";
import { parseUrlState } from "../src/core/urlstate";

let seed = 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const q = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(Math.max(0, -Math.floor(Math.log10(step) + 1e-9))));
const hex = () => `#${Math.floor(rnd() * 0xffffff).toString(16).padStart(6, "0")}`;
const sig6 = (v: number) => Number(v.toPrecision(6));

// the registry is parsed once (parsing it per state made the 2000-state round trip take > 5 s on CI)
const REG = loadRegistry().registry;
function randomState(): ShareState {
  const reg = REG;
  const ids = [...reg.layers.map((l) => l.id)].sort(() => rnd() - 0.5).slice(0, Math.floor(rnd() * 6));
  const layers = ids.map((id) => {
    const cfg: LayerConfig = {};
    if (rnd() < 0.3) cfg.colormap = pick(Object.keys(COLORMAPS));
    if (rnd() < 0.2) cfg.reverse = true;
    if (rnd() < 0.3) { const a = sig6((rnd() - 0.5) * 10 ** Math.floor(rnd() * 8 - 4)); cfg.clim = [a, sig6(a + Math.abs(a || 1) * (0.1 + rnd() * 100))]; }
    if (rnd() < 0.3) cfg.log = rnd() < 0.5;
    if (rnd() < 0.3) cfg.mode = pick(["arrows", "streamlines"] as const);
    if (rnd() < 0.2) cfg.vecColor = hex();
    if (rnd() < 0.3) cfg.spacingKm = pick(SPACING_KM_STEPS);
    if (rnd() < 0.2) cfg.fill = hex();
    if (rnd() < 0.2) cfg.invert = true;
    return { id: rnd() < 0.05 ? `custom-${Math.floor(rnd() * 99)}` : id, opacity: q(rnd(), 0.01), ...(Object.keys(cfg).length ? { cfg } : {}) };
  });
  const st: ShareState = {
    lon: q(rnd() * 360 - 180, 1e-4), lat: q(rnd() * 170 - 85, 1e-4), zoom: q(rnd() * 14, 0.01), proj: rnd() < 0.5 ? "globe" : "mercator",
    dataset: rnd() < 0.05 ? "future-dataset" : pick(SHARE_IDS.datasets), basemap: pick(SHARE_IDS.basemaps), ut: Math.floor(rnd() * 64), layers,
    cell: rnd() < 0.5 ? [Math.floor(rnd() * 1801), Math.floor(rnd() * 3600)] : null,
  };
  if (rnd() < 0.3) st.panel = true;
  if (rnd() < 0.1) { st.bearing = q(rnd() * 360 - 180, 0.1); st.pitch = q(rnd() * 60, 0.1); }
  return st;
}
const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

describe("short share link (#v=…)", () => {
  it("round trip for 2000 random states (quantised to 1e-4°, 0.01 zoom, 0.01 opacity, 6 significant digits)", () => {
    for (let n = 0; n < 2000; n++) {
      const st = randomState();
      const s = encodeShare(st);
      expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
      const d = decodeShare(s)!;
      expect(d).not.toBeNull();
      expect(close(d.lon, st.lon, 1e-9) && close(d.lat, st.lat, 1e-9) && close(d.zoom, st.zoom, 1e-9)).toBe(true);
      const { lon, lat, zoom, ...rest } = st, { lon: l2, lat: a2, zoom: z2, ...rest2 } = d;
      void lon; void lat; void zoom; void l2; void a2; void z2;
      if (rest.bearing === 0 && rest.pitch === 0) { delete rest.bearing; delete rest.pitch; }
      expect(rest2).toEqual({ ...rest, panel: !!rest.panel });
    }
  });
  it("hash parsing; garbage and unknown versions give null", () => {
    const st = randomState();
    expect(shareFromHash(`#v=${encodeShare(st)}`)).toEqual(decodeShare(encodeShare(st)));
    for (const bad of ["", "#", "#v=", "#v=!!", "#v=AAAA", "#x=AQ", "#v=Ag"]) expect(shareFromHash(bad)).toBeNull();
    expect(shareUrl("https://map.geomorphlab.org/", st)).toMatch(/^https:\/\/map\.geomorphlab\.org\/#v=[A-Za-z0-9_-]+$/);
  });
  it("id tables are append-only supersets of the registry, basemaps, datasets and colormaps", () => {
    const reg = loadRegistry().registry;
    for (const l of reg.layers) expect(SHARE_IDS.layers, l.id).toContain(l.id);
    for (const b of reg.basemaps) expect(SHARE_IDS.basemaps, b.id).toContain(b.id);
    for (const d of reg.datasets ?? []) expect(SHARE_IDS.datasets, d.id).toContain(d.id);
    for (const c of Object.keys(COLORMAPS)) expect(SHARE_IDS.colormaps as readonly string[], c).toContain(c);
    // v1 order is frozen: the first entries never move
    expect(SHARE_IDS.layers.slice(0, 3)).toEqual(["dunes", "at", "ae"]);
    expect(SHARE_IDS.datasets).toEqual(["era5-land", "era5"]);
  });
  it("typical links are short (≤ 80 characters with the site address)", () => {
    const base = "https://map.geomorphlab.org/";
    const typical: Record<string, ShareState> = {
      "default view (dunes + DP)": { lon: 15.2, lat: -24.5, zoom: 3.5, proj: "globe", dataset: "era5-land", basemap: "openfreemap-dark", ut: 14, layers: [{ id: "dunes", opacity: 0.7 }, { id: "dpm", opacity: 0.8 }] },
      "selected cell, ERA5, 3 layers": { lon: 15.25, lat: -24.5, zoom: 6.2, proj: "globe", dataset: "era5", basemap: "esri-imagery", ut: 20, cell: [458, 781], panel: true,
        layers: [{ id: "dunes", opacity: 0.7 }, { id: "rdpa", opacity: 1, cfg: { mode: "streamlines", spacingKm: 100 } }, { id: "dpm", opacity: 0.6, cfg: { colormap: "magma", log: true } }] },
      "custom colour limits + invert": { lon: -115.73, lat: 32.98, zoom: 8.4, proj: "mercator", dataset: "era5-land", basemap: "openfreemap-light", ut: 9, cell: [570, 643],
        layers: [{ id: "dunes", opacity: 0.55, cfg: { invert: true, fill: "#c08040" } }, { id: "qsdiv", opacity: 0.9, cfg: { clim: [-0.25, 0.25], colormap: "rdbu" } }] },
    };
    const lengths: Record<string, number> = {};
    for (const [k, st] of Object.entries(typical)) {
      const u = shareUrl(base, st);
      lengths[k] = u.length;
      expect(decodeShare(u.split("#v=")[1])).toMatchObject({ dataset: st.dataset, ut: st.ut });
      expect(u.length, `${k}: ${u}`).toBeLessThanOrEqual(80);
    }
    console.log("share link lengths:", JSON.stringify(lengths));
  });
  it("maps onto the ?query state; old permalinks still parse", () => {
    const st: ShareState = { lon: 15.25, lat: -24.5, zoom: 6.2, proj: "globe", dataset: "era5", basemap: "esri-imagery", ut: 20, cell: [458, 781], layers: [{ id: "dunes", opacity: 0.7 }, { id: "dpm", opacity: 0.6, cfg: { colormap: "magma" } }] };
    expect(shareToUrlState(st)).toEqual({ lon: 15.25, lat: -24.5, zoom: 6.2, basemap: "esri-imagery", proj: "globe", dataset: "era5", ut: 20, cell: [458, 781],
      layers: [{ id: "dunes", opacity: 0.7 }, { id: "dpm", opacity: 0.6, cfg: { colormap: "magma" } }], order: ["dunes", "dpm"] });
    const old = parseUrlState("?lon=15.2000&lat=-24.5000&zoom=6.00&basemap=openfreemap-dark&layers=dunes:0.7,dpm~cm=magma&ut=14&cell=1145,1952&proj=globe&dataset=era5");
    expect(old).toMatchObject({ lon: 15.2, lat: -24.5, zoom: 6, basemap: "openfreemap-dark", ut: 14, cell: [1145, 1952], proj: "globe", dataset: "era5" });
    expect(old.layers).toEqual([{ id: "dunes", opacity: 0.7 }, { id: "dpm", cfg: { colormap: "magma" } }]);
  });
});
