// @vitest-environment happy-dom
// Mars build of the shared UI (src/core/body.ts): header "Dune Atlas Mars", planet toggle back to Earth (site
// root, from the /mars/ base), Mars tour step, and every browser-storage key namespaced per body so the
// Mars first-visit tour still shows after visiting Earth on the same origin.
import { describe, expect, it, vi } from "vitest";
import { BODY, otherBodyUrl, storageKey } from "../../src/core/body";
import { Tools } from "../../src/core/ui/tools";
import { TOUR_SEEN_KEY, tourSeen } from "../../src/core/ui/tour";
import { MODES_OPEN_KEY, sectionOpenKey } from "../../src/core/ui/cellPanel";
import { TOUR_STEPS } from "../../src/core/ui/helpText";
import { renderLayerPanel } from "../../src/core/ui/layerPanel";
import { loadRegistry } from "../../src/core/registry/load";
import { Store } from "../../src/core/store";
import { DEFAULT_VIEW } from "../../src/core/defaultview";
import fs from "node:fs";
import path from "node:path";

describe("Mars build: planet toggle, header, storage", () => {
  it("is the Mars build; the toggle says Switch to Earth and opens the site root from /mars/", () => {
    expect(BODY).toBe("mars");
    const nav = vi.fn();
    const t = new Tools({ startTour: () => {}, shareLink: () => "", exportMap: async () => {}, openAbout: () => {}, navigate: nav });
    const b = t.el.querySelector(".planet-btn") as HTMLButtonElement;
    expect(b.previousElementSibling?.classList.contains("export-btn")).toBe(true);
    expect([b.getAttribute("aria-label"), b.title]).toEqual(["Switch to Earth", "Switch to Earth"]);
    b.click();
    expect(nav).toHaveBeenCalledWith(otherBodyUrl({ resume: true }));
    expect(otherBodyUrl({ resume: true })).toMatch(/[?&]resume=1$/);
    // production (/mars/ on map.geomorphlab.org): the site root; localhost dev/preview: the live Earth site
    expect(otherBodyUrl({ base: "/mars/", host: "map.geomorphlab.org" })).toBe("/");
    expect(otherBodyUrl({ base: "/mars/", embed: true, host: "map.geomorphlab.org" })).toBe("/?embed=1");
    expect(otherBodyUrl({ base: "/mars/", host: "localhost" })).toBe("https://map.geomorphlab.org/");
    expect(otherBodyUrl({ base: "/mars/", host: "127.0.0.1", embed: true })).toBe("https://map.geomorphlab.org/?embed=1");
  });
  it("header: 'Dune Atlas' then the grey body name 'Mars' (no 'Mars Dune Atlas' title)", () => {
    const reg = loadRegistry().registry;
    const root = document.createElement("div");
    renderLayerPanel(root, reg, new Store({ basemap: "x", projection: "globe", utIndex: 29, layers: {}, order: [], dataset: DEFAULT_VIEW.dataset, cell: null, embed: false } as never));
    const h1 = root.querySelector("h1")!;
    expect(h1.textContent).toBe("Dune Atlas Mars");
    expect(h1.querySelector(".body-name")!.textContent).toBe("Mars");
    const sub = root.querySelector(".subtitle")!;
    expect(sub.innerHTML.split("<br>").map((x) => x.replace(/<[^>]+>/g, ""))).toEqual(["Interactive explorer for aeolian geomorphology", "Developed by the Monash Geomorphology Lab"]);
    expect(sub.querySelector("a")!.getAttribute("target")).toBe("_blank");
    // the Wind dataset selector: MCMC FV3 (default), EMARS and MACDA (name and grid; tooltip with the period)
    const sel = root.querySelector("#dataset-select") as HTMLSelectElement;
    expect([...sel.options].map((o) => [o.value, o.textContent, o.title])).toEqual([
      ["fv3-beta1", "MCMC FV3 2°", "MCMC FV3 2°, one Mars year (6th simulated year, 668 sols)"],
      ["emars-v1-my30", "EMARS 6° × 5.14°", "EMARS 6° × 5.14°, one Mars year (Mars Year 30)"],
      ["macda-v2-my30", "MACDA 5°", "MACDA 5°, one Mars year (Mars Year 30)"],
    ]);
    expect(sel.title).toBe("MCMC FV3 2°, one Mars year (6th simulated year, 668 sols)");
    expect(root.querySelector(".dataset-row")!.textContent).toMatch(/^Wind dataset/);
    // dune invert toggle (Terrain's invert tiles; key is the default until reported)
    const dunes = reg.layers.find((l) => l.id === "dunes")!;
    expect([dunes.invertSource, dunes.invertSourceLayer]).toEqual(["dune-atlas/mars/v1/dunes/invert-r2.pmtiles", "invert"]);
    expect(root.querySelector('.layer-item[data-layer="dunes"]')!.textContent).toMatch(/invert \(areas without dunes\)/);
    expect(sub.querySelector("a")!.getAttribute("href")).toBe("https://www.geomorphlab.org/");
    const css = fs.readFileSync(path.resolve(__dirname, "../../src/core/style.css"), "utf8");
    expect(css).toMatch(/\.atlas-header h1 \.body-name \{ color: var\(--muted\)/);
  });
  it("per-atlas keys are duneAtlasMars.*, panel layout keys shared; the Earth tour flag does not suppress the Mars tour", () => {
    expect(TOUR_SEEN_KEY).toBe("duneAtlasMars.tourSeen");
    expect(sectionOpenKey("windRose")).toBe("duneAtlas.cellPanel.windRoseOpen"); // panel layout: both atlases (core/visit.ts)
    expect(MODES_OPEN_KEY).toBe("duneAtlas.cellPanel.modesOpen");
    expect(storageKey("dataset")).toBe("duneAtlasMars.dataset");
    localStorage.clear();
    localStorage.setItem("duneAtlas.tourSeen", "1"); // visited Earth first
    expect(tourSeen()).toBe(false);
    // no Mars source writes an un-namespaced key
    const src = path.resolve(__dirname, "../../src");
    const files = (fs.readdirSync(src, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts"));
    const code = (f: string) => fs.readFileSync(path.join(src, f), "utf8").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n"); // without // comments
    const bad = files.filter((f) => /["'`]duneAtlas\.(?!\$)/.test(code(f)) || /(local|session)Storage\.(get|set|remove)Item\(\s*["'`]/.test(code(f)));
    expect(bad).toEqual([]);
  });
  it("old links with the removed 'dark' basemap open on the default basemap (long and short links)", async () => {
    const { resolveInitialState, initialAppState } = await import("../../src/core/defaultview");
    const { encodeShare, decodeShare } = await import("../../src/core/share/shortlink");
    const reg = loadRegistry().registry;
    expect(reg.basemaps.some((b) => b.id === "dark")).toBe(false);
    const q = resolveInitialState(null, { basemap: "dark", lon: 67, lat: 9 } as never, undefined, undefined);
    expect(initialAppState(reg, q.url, "fv3-beta1").basemap).toBe("hrsc-mola-hillshade");
    const sh = decodeShare(encodeShare({ ...DEFAULT_VIEW, basemap: "dark" }));
    const s = resolveInitialState(sh, {} as never, undefined, undefined);
    expect(initialAppState(reg, s.url, "fv3-beta1").basemap).toBe("hrsc-mola-hillshade");
  });
  it("info popovers follow the same structure on Mars (Wind data = MCMC FV3; slider = grain diameter d)", async () => {
    const { infoHtml } = await import("../../src/core/ui/layerPanel");
    const reg = loadRegistry().registry;
    const L = (id: string) => reg.layers.find((l) => l.id === id)!;
    const rows = (id: string) => [...infoHtml(L(id)).matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1]);
    expect(rows("dpm")).toEqual(["Units", "Wind data", "Slider", "Citation", "Licence"]);
    expect(rows("elevation")).toEqual(["Units", "Wind data", "Slider", "Source", "Citation", "Licence", "Link", "Changes"]);
    expect(infoHtml(L("dpm"))).toMatch(/<dd>MCMC FV3 2°, one Mars year/);
    expect(infoHtml(L("dpm"))).toMatch(/grain-diameter/);
    expect(infoHtml(L("rho_mean"))).toMatch(/fv3betaout1/); // the long FV3 URL (wraps: style.css overflow-wrap)
    for (const l of reg.layers) expect(infoHtml(l).replace(/<dl[\s\S]*<\/dl>/, ""), l.id).not.toMatch(/Shown at the selected|Converted from m²\/s|Independent of the grain diameter d/);
  });
  it("the Mars tour has the planet step after the tools step, on the planet button", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(ids.slice(-2)).toEqual(["tools", "planet"]);
    const p = TOUR_STEPS.at(-1)!;
    expect(p.targets[0]).toBe(".atlas-tools .planet-btn");
    expect(p.body).toMatch(/Earth and Mars share this atlas/);
  });
});

// the invert tiles (devroot); skips until the archive exists
const INVERT = path.resolve(__dirname, "../../../staging/mars/devroot/dune-atlas/mars/v1/dunes/invert-r2.pmtiles");
const invertReady = fs.existsSync(INVERT) && !fs.existsSync(`${INVERT}-journal`) && (() => { const fd = fs.openSync(INVERT, "r"), b = Buffer.alloc(7); fs.readSync(fd, b, 0, 7, 0); fs.closeSync(fd); return b.toString() === "PMTiles"; })(); // not while Terrain is still writing it
describe.skipIf(!invertReady)("Mars invert tiles (devroot)", () => {
  it("the archive has the registry's source-layer", async () => {
    const { PMTiles } = await import("pmtiles");
    const buf = fs.readFileSync(INVERT);
    const src = { getKey: () => INVERT, getBytes: async (o: number, n: number) => ({ data: buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + n) }) };
    const meta = (await new PMTiles(src as never).getMetadata()) as { vector_layers?: { id: string }[] };
    const reg = loadRegistry().registry;
    expect(meta.vector_layers?.map((v) => v.id)).toContain(reg.layers.find((l) => l.id === "dunes")!.invertSourceLayer);
  });
});

describe("Mars: texts at the source, one field citation, FV3 licence, basemap info, MOLA–HRSC", () => {
  const REPO = path.resolve(__dirname, "../../..");
  it("Wind generator outputs: no repeated sentences; citation/licence of every FV3-derived field", async () => {
    for (const f of ["registry/mars/generated/qsat_fields.yaml", "registry/mars/generated/x_extra_fields.yaml"])
      expect(fs.readFileSync(path.join(REPO, f), "utf8"), f).not.toMatch(/Shown at the selected|Shown in m\/kyr|Converted from m²\/s|Displayed as the compass bearing|Independent of the grain diameter/);
    const { fieldsCitation, fieldsLicence } = await import("../../src/core/cell/citation");
    const reg = loadRegistry().registry;
    const derived = reg.layers.filter((l) => l.type === "zarr-field" && l.thresholdAware);
    expect(derived.length).toBe(24);
    for (const l of derived) { expect(l.attribution?.citation, l.id).toBe(fieldsCitation("fv3-beta1")); expect(l.attribution?.licence, l.id).toBe(fieldsLicence("fv3-beta1")); }
    expect(fieldsCitation("fv3-beta1")).toMatch(/^Gunn, A\. \(2026\)\. .* doi:10\.1038\/s41467-026-75466-y; transport law: Pähtz.*; winds: MCMC FV3/);
    expect(fieldsLicence("fv3-beta1")).toBe("NASA Ames MCMC output; no licence stated (NASA open data)");
    expect(reg.layers.find((l) => l.id === "rho_mean")!.attribution?.licence).toBe(fieldsLicence("fv3-beta1"));
    expect(reg.layers.find((l) => l.id === "rdpa")!.description).toMatch(/compass bearing/);
  });
  it("basemap info buttons (6) with the same structure; About cites the FV3 fields; DEM named MOLA–HRSC", async () => {
    const { basemapInfoHtml } = await import("../../src/core/ui/layerPanel");
    const reg = loadRegistry().registry;
    for (const b of reg.basemaps) expect([...basemapInfoHtml(b).matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1]), b.id)
      .toEqual(b.id === "esri-hirise" ? ["Source", "Resolution", "Coverage", "Licence", "Link"] : ["Source", "Resolution", "Licence", "Link"]);
    // HiRISE: polar coverage note (docs/guide/mars.md)
    expect(basemapInfoHtml(reg.basemaps.find((b) => b.id === "esri-hirise")!).replace(/<[^>]+>/g, "")).toContain("between about 65° S and 65° N; no imagery at higher latitudes in this mosaic (Esri OnMars).");
    const root = document.createElement("div");
    renderLayerPanel(root, reg, new Store({ basemap: "x", projection: "globe", utIndex: 29, layers: {}, order: [], dataset: DEFAULT_VIEW.dataset, cell: null, embed: false } as never));
    expect(root.querySelectorAll(".basemap-row .info-button").length).toBe(6);
    const about = root.querySelector(".about")!.textContent!;
    expect(about).toMatch(/Citing the map fields/);
    expect(about).toMatch(/MCMC FV3 2°: Gunn, A\. \(2026\)\..*transport law: Pähtz/);
    const pub = [fs.readFileSync(path.join(REPO, "registry/mars/layers.yaml"), "utf8"), fs.readFileSync(path.join(REPO, "app/src/bodies/mars/helpText.ts"), "utf8"), fs.readFileSync(path.join(REPO, "app/src/bodies/mars/profile.ts"), "utf8"), root.textContent!].join("\n");
    expect(pub).not.toMatch(/HRSC[–-]MOLA/);
    expect(pub).toMatch(/MOLA–HRSC/);
  });
});
