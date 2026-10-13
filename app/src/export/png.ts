// Export resolution and PNG metadata: one output resolution, 300 dpi at the on-screen size
// (1 CSS px = 1/96 in), written to the PNG pHYs chunk.
export const EXPORT_DPI = 300;
export const EXPORT_PIXEL_RATIO = EXPORT_DPI / 96; // 3.125

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

/** Where the strip goes under a captured canvas: the canvas scale may be lower than requested
 *  (MapLibre clamps the drawing buffer to maxCanvasSize), so the strip uses the ACTUAL scale of
 *  the canvas on both axes (uniform: no squeezed text). */
export function stripPlacement(canvas: { width: number; height: number }, cssWidth: number, strip: { height: number }) {
  const scale = canvas.width / cssWidth;
  return { x: 0, y: canvas.height, width: canvas.width, height: Math.round(strip.height * scale), scale, dpi: 96 * scale };
}

export async function blobWithDpi(blob: Blob, dpi: number): Promise<Blob> {
  return new Blob([setPngDpi(new Uint8Array(await blob.arrayBuffer()), dpi) as BlobPart], { type: "image/png" });
}
