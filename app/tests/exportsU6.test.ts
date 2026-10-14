// @vitest-environment happy-dom
// Map export layout: strip below the map, as before; download confirmations.
import { describe, expect, it, vi } from "vitest";
import { loadRegistry } from "../src/core/registry/load";
import { initialAppState, DEFAULT_VIEW } from "../src/core/defaultview";
import { shareToUrlState } from "../src/core/share/shortlink";
import { mapStripItems, EXPORT_STAGES } from "../src/core/export/mapExport";
import { stripSvg } from "../src/core/export/strip";
import { mapExportWidth } from "../src/core/export/png";
import { announceDownload, DOWNLOAD_EVENT, triggerDownload } from "../src/core/cell/downloads";
import { Tools } from "../src/core/ui/tools";
import { EXPORT_TEXT } from "../src/core/ui/helpText";

const reg = loadRegistry().registry;
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });

describe("map export layout (back to the strip below the map)", () => {
  const st = initialAppState(reg, shareToUrlState(DEFAULT_VIEW), DEFAULT_VIEW.dataset);
  const ctx = (cssW: number) => ({ reg, state: st, view: { lon: 15, lat: -24, zoom: 4, bearing: 0, pitch: 0, proj: "globe" as const }, width: cssW, includeBasemap: true, shareLink: "https://map.geomorphlab.org/#v=abcdefgh", date: new Date(Date.UTC(2026, 9, 14)) });
  it("strip below the map across its full width; no selected-cell line; no text beyond the right edge", () => {
    for (const w of [1370, 1920, 1024]) {
      const W = mapExportWidth(w);
      const strip = stripSvg(mapStripItems(ctx(w)), { pxWidth: W });
      expect(strip.svg).toMatch(new RegExp(`width="${W}"`));
      const vb = Number(/viewBox="0 0 ([\d.]+) /.exec(strip.svg)![1]);
      for (const m of strip.svg.matchAll(/<text[^>]*\bx="([\d.]+)"/g)) expect(Number(m[1]), `x at ${w}`).toBeLessThan(vb);
    }
    const items = mapStripItems(ctx(1370));
    expect(items.some((i) => i.kind === "text" && /selected cell|Outlined in red/i.test(i.text))).toBe(false);
    expect(EXPORT_TEXT.note).not.toMatch(/slide|Landscape|selected cell/i);
    expect(EXPORT_TEXT.note).toMatch(/below the map/);
    expect(Object.values(EXPORT_STAGES).length).toBe(3);
  });
});

describe("download confirmations", () => {
  it("every download fires the page event; the tools show a status message naming the file", async () => {
    document.body.innerHTML = "";
    const tools = new Tools({ startTour: () => {}, shareLink: () => "x", exportMap: async () => {}, openAbout: () => {} });
    document.body.append(tools.el);
    const seen: string[] = [];
    document.addEventListener(DOWNLOAD_EVENT, (e) => seen.push((e as CustomEvent).detail.name));
    Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
    triggerDownload("cell.zip", "data", "application/zip");
    announceDownload("map.png");
    expect(seen).toEqual(["cell.zip", "map.png"]);
    const t = [...document.querySelectorAll(".toast")].map((x) => x.textContent);
    expect(t).toContain(`${EXPORT_TEXT.downloaded} cell.zip`);
    expect(t).toContain(`${EXPORT_TEXT.downloaded} map.png`);
    expect(document.querySelector(".toast")!.getAttribute("role")).toBe("status");
  });
});
