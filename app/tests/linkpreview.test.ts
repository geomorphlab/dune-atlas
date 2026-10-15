// Link previews (Slack, Bluesky, …): Open Graph tags with absolute URLs and one 1200 × 630 image for the whole site
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { previewTags } from "../scripts/body-html";
import { HTML as EARTH } from "../src/bodies/earth/html";
import { HTML as MARS } from "../src/bodies/mars/html";

const pngSize = (f: string) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
describe("link previews", () => {
  for (const [name, t] of [["earth", EARTH], ["mars", MARS]] as const) {
    it(`${name}: title, description, absolute URL and a 1200 × 630 image in public/`, () => {
      const tags = previewTags(t);
      for (const p of ["og:title", "og:description", "og:url", "og:image", "og:image:alt"]) expect(tags).toContain(`property="${p}"`);
      expect(tags).toContain('name="twitter:card" content="summary_large_image"');
      expect(t.url).toMatch(/^https:\/\/map\.geomorphlab\.org\//);
      expect(t.image).toBe("https://map.geomorphlab.org/og-image.png");
      expect(pngSize(`public/${t.image.split("/").pop()}`)).toEqual([1200, 630]);
    });
  }
  it("index.html carries the Earth tags (the dev server and the Earth build are the same page)", () => {
    expect(fs.readFileSync("index.html", "utf8")).toContain(previewTags(EARTH));
  });
});
