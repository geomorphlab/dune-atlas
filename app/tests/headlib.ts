// Shared by tests/head.test.ts and tests/mars/head.test.ts: tab title and lab icon.
import { expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

export const INDEX = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
const PUBLIC = path.resolve(__dirname, "../public");
const pngSize = (f: string) => { const b = fs.readFileSync(path.join(PUBLIC, f)); expect(b.subarray(1, 4).toString()).toBe("PNG"); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

export function checkHead(html: string) {
  expect(html.match(/<title>([^<]*)<\/title>/)![1]).toBe("MGL - Dune Atlas");
  // base-relative links (Vite replaces %BASE_URL%: / for Earth, /mars/ for Mars)
  expect(html).toContain('<link rel="icon" href="%BASE_URL%favicon.ico" sizes="any" />');
  expect(html).toContain('<link rel="icon" type="image/png" sizes="32x32" href="%BASE_URL%favicon-32.png" />');
  expect(html).toContain('<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" />');
  expect(html).toContain('<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />');
  expect(fs.readFileSync(path.join(PUBLIC, "favicon.svg"), "utf8")).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 64 64"/);
  expect(html).not.toMatch(/href="\/(favicon|apple-touch)/);         // no root-absolute icon path (would miss /mars/)
  // the files (app/public, copied to the build root)
  const ico = fs.readFileSync(path.join(PUBLIC, "favicon.ico"));
  expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);  // ICO header
  expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(2);               // several sizes (16/32/48)
  expect(pngSize("favicon-32.png")).toEqual([32, 32]);
  expect(pngSize("apple-touch-icon.png")).toEqual([180, 180]);
  expect(pngSize("icon-192.png")).toEqual([192, 192]);
}
