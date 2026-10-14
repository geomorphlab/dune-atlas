// @vitest-environment happy-dom
// Mars user-facing text: collection for the audit (TEXT_DUMP) and the user-text checks.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { collectMarsPublicText } from "./publictext";
import { devPhraseHits, PENDING_OTHER_TRACK } from "../usertextlib";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });

describe("Mars public text", () => {
  it("collects the site and download strings", async () => {
    const t = await collectMarsPublicText();
    if (process.env.TEXT_DUMP) fs.writeFileSync(process.env.TEXT_DUMP, JSON.stringify(t, null, 1));
    expect(Object.keys(t).length).toBeGreaterThan(300);
    expect(t["embed.bar"]).toBe("Open full screen ↗Best viewed full screen"); // pill + note (textContent joins them)
  });
  it("site and download strings are written for visitors", async () => {
    const t = await collectMarsPublicText();
    const hits = devPhraseHits(t);
    if (process.env.TEXT_DENY_SOFT) { console.log(hits.join("\n")); return; }
    expect(hits).toEqual([]);
    expect(Object.keys(t).filter((k) => k.startsWith("popover.")).length).toBeGreaterThan(30); // layer and basemap ⓘ collected
    expect(devPhraseHits({ x: "reprojected to the web map in the browser" }).length).toBeGreaterThan(0);
    // the Terrain-owned dune 'changes' text: still the reported old string, or already replaced
    const ch = t["layer.dunes.attribution.changes"] ?? "";
    expect(PENDING_OTHER_TRACK.includes(ch) || !/\bPI\b/.test(ch)).toBe(true);
  });
});
