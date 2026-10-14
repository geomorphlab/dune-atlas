// Tab title "MGL - Dune Atlas" (identical to Earth) and the lab icon, Mars: index.html through the
// body-html transform (scripts/body-html.ts) with the Mars texts (src/bodies/mars/html.ts).
import { describe, expect, it } from "vitest";
import { bodyHtml } from "../../scripts/body-html";
import { HTML as MARS_HTML } from "../../src/bodies/mars/html";
import { HTML as EARTH_HTML } from "../../src/bodies/earth/html";
import { INDEX, checkHead } from "../headlib";

const transform = (t: typeof MARS_HTML) => (bodyHtml(t) as unknown as { transformIndexHtml: (h: string) => string }).transformIndexHtml(INDEX);

describe("page head (Mars)", () => {
  it("same title as Earth; icon links kept for the /mars/ base; Mars description and noscript", () => {
    const html = transform(MARS_HTML);
    expect(MARS_HTML.title).toBe("MGL - Dune Atlas");
    checkHead(html);
    expect(html).toContain(MARS_HTML.description);
    expect(html).toContain(`<noscript>${MARS_HTML.noscript}</noscript>`);
  });
  it("the Earth texts are the ones in index.html (the transform leaves the Earth page unchanged)", () => {
    expect(transform(EARTH_HTML)).toBe(INDEX);
  });
});
