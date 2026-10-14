// Minimal ZIP writer, pure TypeScript: DEFLATE (method 8) via a supplied raw-deflate function
// (browser / node: CompressionStream("deflate-raw"), see deflateRaw) with STORED (method 0)
// fallback when compression is unavailable or does not help. UTF-8 file names (flag bit 11).

let CRC_TABLE: Uint32Array | null = null;
export function crc32(b: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry { name: string; data: Uint8Array | string }

function dosDateTime(d: Date): [number, number] {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [time, date];
}

export type DeflateRaw = (b: Uint8Array) => Promise<Uint8Array>;

/** Raw DEFLATE via CompressionStream("deflate-raw") (browsers, Node >= 21); undefined if unsupported. */
export function deflateRawAvailable(): DeflateRaw | undefined {
  const CS = (globalThis as { CompressionStream?: new (f: string) => GenericTransformStream }).CompressionStream;
  if (!CS) return undefined;
  try { new CS("deflate-raw"); } catch { return undefined; }
  return async (b: Uint8Array) => {
    const stream = new Blob([b as BlobPart]).stream().pipeThrough(new CS("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };
}

/** ZIP archive; entries DEFLATE-compressed with `deflate` (default: CompressionStream when
 *  available), stored when compression is unavailable, fails, or is not smaller. */
export async function writeZip(entries: ZipEntry[], when: Date = new Date(), deflate: DeflateRaw | null | undefined = deflateRawAvailable()): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const [time, date] = dosDateTime(when);
  const files = await Promise.all(entries.map(async (e) => {
    const name = enc.encode(e.name);
    const raw = typeof e.data === "string" ? enc.encode(e.data) : e.data;
    let body = raw, method = 0;
    if (deflate) {
      try { const z = await deflate(raw); if (z.length < raw.length) { body = z; method = 8; } } catch { /* stored */ }
    }
    return { name, raw, body, method, crc: crc32(raw) };
  }));
  const size = files.reduce((a, f) => a + 30 + f.name.length + f.body.length + 46 + f.name.length, 22);
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  let p = 0;
  const u16 = (v: number) => { dv.setUint16(p, v, true); p += 2; };
  const u32 = (v: number) => { dv.setUint32(p, v >>> 0, true); p += 4; };
  const offsets: number[] = [];
  for (const f of files) {
    offsets.push(p);
    u32(0x04034b50); u16(20); u16(0x0800); u16(f.method); u16(time); u16(date);
    u32(f.crc); u32(f.body.length); u32(f.raw.length); u16(f.name.length); u16(0);
    out.set(f.name, p); p += f.name.length;
    out.set(f.body, p); p += f.body.length;
  }
  const cdStart = p;
  files.forEach((f, i) => {
    u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(f.method); u16(time); u16(date);
    u32(f.crc); u32(f.body.length); u32(f.raw.length); u16(f.name.length); u16(0); u16(0); u16(0); u16(0);
    u32(0); u32(offsets[i]);
    out.set(f.name, p); p += f.name.length;
  });
  const cdSize = p - cdStart;
  u32(0x06054b50); u16(0); u16(0); u16(files.length); u16(files.length); u32(cdSize); u32(cdStart); u16(0);
  return out;
}
