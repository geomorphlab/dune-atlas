// Download counter in the Mars build: messages name the planet "mars"; nothing is sent without
// VITE_USAGE_URL
import { describe, expect, it, vi } from "vitest";
import { downloadType, sendUsage, USAGE_URL } from "../../src/core/usage";
import { mapExportFilename } from "../../src/core/export/mapExport";

describe("Mars download counter", () => {
  it("sends body mars and recognises the Mars file names", () => {
    expect(USAGE_URL).toBe("");
    const f = vi.fn(async () => undefined);
    expect(sendUsage("map-image", 7, { url: "https://counter.example/v1/n", fetch: f })).toBe(true);
    expect(f).toHaveBeenCalledWith("https://counter.example/v1/n", expect.objectContaining({ body: '{"type":"map-image","body":"mars","bytes":7}' }));
    expect(downloadType(mapExportFilename("mcd", { lat: 1, lon: 2, zoom: 3 }, new Date("2026-10-15")))).toBe("map-image");
  });
});
