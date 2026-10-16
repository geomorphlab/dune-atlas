// Renders the atlas icons in app/public from app/public/favicon.svg (the source): favicon.ico (16, 32, 48 px,
// PNG-compressed entries), favicon-32.png, icon-192.png and apple-touch-icon.png (180 px on white: iOS fills
// transparency with black). Run from app/:  node scripts/build-icons.mjs   (docs/guide/icon.md)
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";
const PUB = path.resolve("public");
const svg = fs.readFileSync(path.join(PUB, "favicon.svg"), "utf8");
const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const vb = svg.match(/viewBox="([^"]+)"/)[1];
const png = (size, bg) => new Resvg(bg ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><rect x="0" y="0" width="100%" height="100%" fill="${bg}"/>${inner}</svg>` : svg,
  { fitTo: { mode: "width", value: size } }).render().asPng();
function ico(pngs) {   // ICONDIR + ICONDIRENTRY per image, PNG data appended (Vista+ format)
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([s, b], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(b.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += b.length;
  });
  return Buffer.concat([head, ...pngs.map(([, b]) => b)]);
}
fs.writeFileSync(path.join(PUB, "favicon.ico"), ico([16, 32, 48].map((s) => [s, png(s)])));
fs.writeFileSync(path.join(PUB, "favicon-32.png"), png(32));
fs.writeFileSync(path.join(PUB, "icon-192.png"), png(192));
fs.writeFileSync(path.join(PUB, "apple-touch-icon.png"), png(180, "#ffffff"));
console.log("wrote favicon.ico, favicon-32.png, icon-192.png, apple-touch-icon.png");
