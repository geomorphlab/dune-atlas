// Minimal NetCDF-3 reader for tests (classic / 64-bit offset, no record dimension).
// ---- minimal NetCDF-3 reader (classic / 64-bit offset, no record dimension) ----
export function readNc(buf: Uint8Array) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = 0;
  const u32 = () => { const v = dv.getUint32(p, false); p += 4; return v; };
  const dec = new TextDecoder();
  const pad = () => { p += (4 - (p % 4)) % 4; };
  const name = () => { const n = u32(); const s = dec.decode(buf.subarray(p, p + n)); p += n; pad(); return s; };
  const SIZE: Record<number, number> = { 2: 1, 4: 4, 5: 4, 6: 8 };
  const vals = (t: number, n: number) => {
    const out: number[] = [];
    if (t === 2) { const s = dec.decode(buf.subarray(p, p + n)); p += n; pad(); return s; }
    for (let i = 0; i < n; i++) { out.push(t === 4 ? dv.getInt32(p, false) : t === 5 ? dv.getFloat32(p, false) : dv.getFloat64(p, false)); p += SIZE[t]; }
    pad();
    return out;
  };
  const attrs = () => {
    const tag = u32(), n = u32();
    const a: Record<string, unknown> = {};
    if (tag === 0) return a;
    for (let i = 0; i < n; i++) { const k = name(); const t = u32(); const m = u32(); a[k] = vals(t, m); }
    return a;
  };
  const magic = dec.decode(buf.subarray(0, 3)); const version = buf[3]; p = 4;
  const numrecs = u32();
  u32(); const nd = u32();
  const dims: { name: string; size: number }[] = [];
  for (let i = 0; i < nd; i++) dims.push({ name: name(), size: u32() });
  const gatts = attrs();
  u32(); const nv = u32();
  const vars: Record<string, { dims: string[]; attrs: Record<string, unknown>; type: number; begin: number; data?: unknown }> = {};
  for (let i = 0; i < nv; i++) {
    const nm = name(); const k = u32(); const ids = Array.from({ length: k }, () => u32());
    const at = attrs(); const type = u32(); u32();
    const begin = version === 2 ? dv.getUint32(p, false) * 2 ** 32 + dv.getUint32(p + 4, false) : dv.getUint32(p, false);
    p += version === 2 ? 8 : 4;
    vars[nm] = { dims: ids.map((d) => dims[d].name), attrs: at, type, begin };
  }
  const hdrEnd = p;
  for (const v of Object.values(vars)) {
    const n = v.dims.reduce((a, d) => a * dims.find((x) => x.name === d)!.size, 1);
    p = v.begin;
    v.data = vals(v.type, n);
  }
  return { magic, version, numrecs, dims, gatts, vars, hdrEnd };
}

