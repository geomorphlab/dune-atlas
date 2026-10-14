// Export pixel sizes and PNG metadata. Map: W = clamp(on-screen width x 1.5, 1600, 2400) px;
// plots: PLOT_EXPORT_WIDTH px. Text and keys are sized relative to W (strip.ts). The PNG pHYs
// chunk is always 300 dpi: it only sets the print size (W / 300 in wide).
import { STRIP_UNITS } from "./strip";

export const EXPORT_DPI = 300;
export const MAP_EXPORT = { factor: 1.5, min: 1600, max: 2400 } as const;
/** map export width (px) for an on-screen map width (CSS px) */
export const mapExportWidth = (cssWidth: number) => Math.min(MAP_EXPORT.max, Math.max(MAP_EXPORT.min, Math.round(cssWidth * MAP_EXPORT.factor)));
/** the pixel ratio the map is captured at */
export const mapExportPixelRatio = (cssWidth: number) => mapExportWidth(cssWidth) / cssWidth;
/** plot export width (px) */
export const PLOT_EXPORT_WIDTH = 1600;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** pixels per metre for a dpi (300 dpi -> 11811) */
export const dpiToPpm = (dpi: number) => Math.round(dpi / 0.0254);

/** PNG bytes with a pHYs chunk (pixels per metre, unit = metre) right after IHDR; an existing pHYs
 *  is replaced. */
export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (dv.getUint32(0) !== 0x89504e47) throw new Error("not a PNG");
  const chunks: Uint8Array[] = [png.subarray(0, 8)];
  let p = 8, inserted = false;
  const ppm = dpiToPpm(dpi);
  const phys = new Uint8Array(21);
  const pv = new DataView(phys.buffer);
  pv.setUint32(0, 9); phys.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  pv.setUint32(8, ppm); pv.setUint32(12, ppm); phys[16] = 1;
  pv.setUint32(17, crc32(phys.subarray(4, 17)));
  while (p < png.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    const end = p + 12 + len;
    if (type !== "pHYs") chunks.push(png.subarray(p, end));
    if (type === "IHDR" && !inserted) { chunks.push(phys); inserted = true; }
    p = end;
  }
  const out = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** pHYs of a PNG: [pixels per metre x, y, unit] or null */
export function readPngPhys(png: Uint8Array): [number, number, number] | null {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  for (let p = 8; p < png.length;) {
    const len = dv.getUint32(p), type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    if (type === "pHYs") return [dv.getUint32(p + 8), dv.getUint32(p + 12), png[p + 16]];
    p += 12 + len;
  }
  return null;
}

/** Where the strip goes under a captured canvas: the strip spans the canvas's ACTUAL pixel width
 *  (MapLibre may clamp the drawing buffer to maxCanvasSize) with the same factor on both axes, so
 *  text keeps its aspect and its size relative to the image. */
export function stripPlacement(canvas: { width: number; height: number }, strip: { height: number }) {
  const scale = canvas.width / STRIP_UNITS; // px per strip unit
  return { x: 0, y: canvas.height, width: canvas.width, height: Math.round(strip.height * scale), scale };
}

export async function blobWithDpi(blob: Blob, dpi: number): Promise<Blob> {
  return new Blob([setPngDpi(new Uint8Array(await blob.arrayBuffer()), dpi) as BlobPart], { type: "image/png" });
}
