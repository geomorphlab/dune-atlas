// @vitest-environment happy-dom
// Review round 2026-10: landscape map export with the selected cell (U6), download confirmations (L14).
import { describe, expect, it, vi } from "vitest";
import { loadRegistry } from "../src/registry/load";
import { initialAppState, DEFAULT_VIEW } from "../src/defaultview";
import { shareToUrlState } from "../src/share/shortlink";
import { mapStripItems, selectedCellText, SIDE, sideLayout, sideWidth, EXPORT_STAGES } from "../src/export/mapExport";
import { stripSvg, STRIP_FS, slidePt } from "../src/export/strip";
import { mapExportWidth } from "../src/export/png";
import { announceDownload, DOWNLOAD_EVENT, triggerDownload } from "../src/cell/downloads";
import { Tools } from "../src/ui/tools";
import { EXPORT_TEXT } from "../src/ui/helpText";

const reg = loadRegistry().registry;
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });

describe("landscape map export (review U6)", () => {
  const st = initialAppState(reg, shareToUrlState(DEFAULT_VIEW), DEFAULT_VIEW.dataset);
  const ctx = (cssW: number) => ({ reg, state: st, view: { lon: 15, lat: -24, zoom: 4, bearing: 0, pitch: 0, proj: "globe" as const }, width: cssW, includeBasemap: true, shareLink: "https://map.geomorphlab.org/#v=abcdefgh", date: new Date(Date.UTC(2026, 9, 14)), selectedCell: { lat: -23.25, lon: 15 } });
  it("map left, strip column right: wider than tall at common window sizes; text about 11 pt on a 16:9 slide", () => {
    for (const [w, hh] of [[1370, 900], [1920, 1080], [1280, 720], [1024, 768]]) {
      const W = mapExportWidth(w), H = Math.round((W * hh) / w);
      const strip = stripSvg(mapStripItems(ctx(w)), { units: SIDE.units });
      const lay = sideLayout({ width: W, height: H }, strip.height);
      expect(lay.width / lay.height, `${w}x${hh}`).toBeGreaterThan(1.3);
      expect(lay.strip.x).toBe(W);
      expect(lay.strip.width).toBe(sideWidth(W));
    }
    const textFrac = (STRIP_FS.text / SIDE.units) * SIDE.frac;   // body text / image width
    expect(slidePt(textFrac)).toBeGreaterThan(10);
    expect(slidePt(textFrac)).toBeLessThan(12.5);
    expect(EXPORT_TEXT.note).toMatch(/Landscape PNG/);
    expect(EXPORT_TEXT.note).toMatch(/about 11 pt/);
  });
  it("the strip names the outlined selected cell; the scale bar follows the column scale", () => {
    const items = mapStripItems(ctx(1370));
    expect(items.some((i) => i.kind === "text" && i.text === selectedCellText({ lat: -23.25, lon: 15 }))).toBe(true);
    expect(selectedCellText({ lat: -23.25, lon: 15 })).toBe("Outlined in red: the selected cell, centre 23.25° S, 15.00° E.");
    const k = (mapStripItems({ ...ctx(1370), stripScale: 0.5 }).find((i) => i.kind === "mapkeys") as { scale: { px: number } | null }).scale;
    const k1 = (mapStripItems({ ...ctx(1370), stripScale: 1 }).find((i) => i.kind === "mapkeys") as { scale: { px: number } | null }).scale;
    if (k && k1) expect(k.px * 2).toBeCloseTo(k1.px, 6);
    expect(mapStripItems({ ...ctx(1370), selectedCell: null }).some((i) => i.kind === "text" && /selected cell/.test(i.text))).toBe(false);
    expect(Object.values(EXPORT_STAGES).length).toBe(3);
  });
});

describe("download confirmations (review L14)", () => {
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
