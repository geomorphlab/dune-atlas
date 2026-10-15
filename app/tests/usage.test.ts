// @vitest-environment happy-dom
// Download counter (src/core/usage.ts): export type from the file name, the message (type, planet, size
// only), sending by beacon with a keepalive fallback, nothing sent without VITE_USAGE_URL, and the type
// list shared with the counter (workers/usage/src/events.ts)
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { countCopy, countDownload, downloadType, sendUsage, USAGE_URL, usageMessage, type UsageType } from "../src/core/usage";
import { mapExportFilename } from "../src/core/export/mapExport";
import { PLOT_KEYS, plotFilename } from "../src/core/export/plotExport";
import { exportBaseName } from "../src/core/cell/export";
import { announceDownload, DOWNLOAD_EVENT } from "../src/core/cell/downloads";

const URL_ = "https://dune-atlas-usage.example.workers.dev/event";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe("export type from the file name", () => {
  it("knows every file the atlas saves", () => {
    const cell = exportBaseName({ lat: -23.25, lon: 15 }, "era5-land");
    expect(downloadType(mapExportFilename("era5-land", { lat: -23.25, lon: 15, zoom: 5 }, new Date("2026-10-15")))).toBe("map-image");
    expect(downloadType("dune-atlas_region_era5-land_latm24to-23_lon15to16.zip")).toBe("region");
    expect(downloadType("mars-dune-atlas_region_mcd_latm24to-23_lon15to16.zip")).toBe("region");
    expect(downloadType(`${cell}.nc`)).toBe("cell-netcdf");
    expect(downloadType(`${cell}.zip`)).toBe("cell-csv");
    expect(downloadType(`${cell}_citation.txt`)).toBe("citation");
    for (const k of PLOT_KEYS) for (const ext of ["png", "svg"] as const) expect(downloadType(plotFilename(k, "era5-land", { lat: 1, lon: 2 }, 0.15, ext))).toBe("plot");
    expect(downloadType("notes.md")).toBeNull();
  });
  it("a plot of a dataset whose id contains 'map' is still a plot", () => {
    expect(downloadType("dune-atlas_wind-rose_map_1_2.png")).toBe("plot");
  });
});

describe("the message", () => {
  it("holds the type, the planet and the size, and nothing else", () => {
    expect(JSON.parse(usageMessage("region", "earth", 123456))).toEqual({ type: "region", body: "earth", bytes: 123456 });
    expect(JSON.parse(usageMessage("copy-code", "mars", 99))).toEqual({ type: "copy-code", body: "mars", bytes: 0 });
    expect(JSON.parse(usageMessage("plot", "earth", -1)).bytes).toBe(0);
    expect(usageMessage("plot", "earth", 10).length).toBeLessThan(256); // the counter refuses longer messages
  });
});

describe("sending", () => {
  it("sends nothing when no counter address is set (tests, dev server)", () => {
    expect(USAGE_URL).toBe("");
    const beacon = vi.fn(() => true), f = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    vi.stubGlobal("fetch", f);
    expect(sendUsage("region", 10)).toBe(false);
    announceDownload("dune-atlas_era5_1_2.nc", 10);
    expect(beacon).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });
  it("uses the browser's beacon with plain text", () => {
    const beacon = vi.fn(() => true);
    expect(sendUsage("cell-netcdf", 2048, { url: URL_, body: "earth", nav: { sendBeacon: beacon } })).toBe(true);
    expect(beacon).toHaveBeenCalledWith(URL_, '{"type":"cell-netcdf","body":"earth","bytes":2048}');
  });
  it("falls back to a keepalive request without cookies when the beacon is missing or refused", () => {
    const f = vi.fn(async () => undefined);
    expect(sendUsage("plot", 5, { url: URL_, body: "mars", nav: { sendBeacon: () => false }, fetch: f })).toBe(true);
    expect(f).toHaveBeenCalledWith(URL_, expect.objectContaining({ method: "POST", keepalive: true, credentials: "omit", body: '{"type":"plot","body":"mars","bytes":5}' }));
    expect(sendUsage("plot", 5, { url: URL_, body: "mars", nav: {}, fetch: f })).toBe(true);
  });
  it("a failing counter never throws into the download", async () => {
    const reject = vi.fn(async () => { throw new Error("blocked"); });
    expect(sendUsage("region", 1, { url: URL_, nav: {}, fetch: reject })).toBe(true);
    expect(sendUsage("region", 1, { url: URL_, nav: { sendBeacon: () => { throw new Error("no"); } } })).toBe(false);
    await Promise.resolve();
  });
  it("unknown file names are not counted; copies are counted with size 0", () => {
    const beacon = vi.fn(() => true);
    expect(countDownload("readme.md", 10, { url: URL_, nav: { sendBeacon: beacon } })).toBe(false);
    expect(countCopy("copy-citation", { url: URL_, body: "earth", nav: { sendBeacon: beacon } })).toBe(true);
    expect(beacon).toHaveBeenCalledWith(URL_, '{"type":"copy-citation","body":"earth","bytes":0}');
  });
});

describe("in the page", () => {
  it("every download announces its name and size, and is counted when the build sets VITE_USAGE_URL", async () => {
    vi.stubEnv("VITE_USAGE_URL", URL_);
    const beacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    const { announceDownload: announce } = await import("../src/core/cell/downloads");
    const seen: unknown[] = [];
    document.addEventListener(DOWNLOAD_EVENT, (e) => seen.push((e as CustomEvent).detail));
    announce("dune-atlas_era5_1_2_citation.txt", 321);
    expect(seen).toEqual([{ name: "dune-atlas_era5_1_2_citation.txt", bytes: 321 }]);
    expect(beacon).toHaveBeenCalledWith(URL_, '{"type":"citation","body":"earth","bytes":321}');
  });
  it("Copy code in 'Get the whole grid' is counted after the code is copied", async () => {
    vi.stubEnv("VITE_USAGE_URL", URL_);
    const beacon = vi.fn(() => true), write = vi.fn(async () => {});
    vi.stubGlobal("navigator", { sendBeacon: beacon, clipboard: { writeText: write } });
    const { wireBulkGuide } = await import("../src/core/ui/bulkguide");
    document.body.innerHTML = '<div id="r"><pre id="c-code">print(1)</pre><button class="copy-code" data-copy="c-code">Copy code</button></div>';
    const root = document.getElementById("r")!;
    wireBulkGuide(root);
    (root.querySelector("button") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(beacon).toHaveBeenCalledWith(URL_, '{"type":"copy-code","body":"earth","bytes":0}'));
  });
});

describe("the counter accepts exactly these types", () => {
  it("the app's types equal the counter's list", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../workers/usage/src/events.ts"), "utf8");
    const block = src.match(/EVENT_TYPES = \[([\s\S]*?)\] as const/)![1];
    const worker = [...block.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]).sort();
    const app: UsageType[] = ["map-image", "region", "cell-netcdf", "cell-csv", "citation", "plot", "copy-code", "copy-citation"];
    expect(worker).toEqual([...app].sort());
  });
});
