// Tab title "MGL - Dune Atlas" (identical to Earth) and the lab icon, Mars: index.html
// through the Mars build's HTML transform (scripts/body-plugin.ts, MARS_HTML).
import { describe, expect, it } from "vitest";
import { bodyPlugin } from "../../scripts/body-plugin";
import { MARS_HTML } from "../../src/bodies/mars/build";
import { INDEX, checkHead } from "../headlib";

describe("page head (Mars)", () => {
  it("same title as Earth; icon links kept for the /mars/ base; Mars description", () => {
    const html = (bodyPlugin("mars") as unknown as { transformIndexHtml: (h: string) => string }).transformIndexHtml(INDEX);
    expect(MARS_HTML.title).toBe("MGL - Dune Atlas");
    checkHead(html);
    expect(html).toContain(MARS_HTML.description);
  });
});
