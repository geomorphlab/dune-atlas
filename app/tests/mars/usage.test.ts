// Download counter in the Mars build: messages name the planet "mars"; nothing is sent without
// VITE_USAGE_URL
import { describe, expect, it, vi } from "vitest";
import { downloadType, sendUsage, USAGE_URL } from "../../src/core/usage";
import { mapExportFilename } from "../../src/core/export/mapExport";

describe("Mars download counter", () => {
  it("sends body mars and recognises the Mars file names", () => {
    expect(USAGE_URL).toBe("");
    const beacon = vi.fn(() => true);
    expect(sendUsage("map-image", 7, { url: "https://counter.example/event", nav: { sendBeacon: beacon } })).toBe(true);
    expect(beacon).toHaveBeenCalledWith("https://counter.example/event", '{"type":"map-image","body":"mars","bytes":7}');
    expect(downloadType(mapExportFilename("mcd", { lat: 1, lon: 2, zoom: 3 }, new Date("2026-10-15")))).toBe("map-image");
  });
});
