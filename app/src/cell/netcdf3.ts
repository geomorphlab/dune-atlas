// Minimal NetCDF-3 writer (classic CDF-1 or 64-bit offset CDF-2), pure TypeScript, no record
// dimension. Supports fixed dimensions, NC_CHAR / NC_INT / NC_FLOAT / NC_DOUBLE variables and
// global / variable attributes (text, int, float, double). Big-endian as the format requires.
// Format: https://docs.unidata.ucar.edu/netcdf-c/current/file_format_specifications.html

export type NcType = "char" | "int" | "float" | "double";
const TYPE_CODE: Record<NcType, number> = { char: 2, int: 4, float: 5, double: 6 };
const TYPE_SIZE: Record<NcType, number> = { char: 1, int: 4, float: 4, double: 8 };
const NC_DIMENSION = 0x0a, NC_VARIABLE = 0x0b, NC_ATTRIBUTE = 0x0c;

/** Attribute value: string -> NC_CHAR (UTF-8); number / number[] -> NC_DOUBLE unless typed. */
export type NcAttrValue = string | number | number[] | { type: "int" | "float" | "double"; values: number | number[] };
export type NcAttrs = Record<string, NcAttrValue>;

export interface NcVariable {
  name: string;
  type: NcType;
  dims: string[];
  attrs?: NcAttrs;
  /** values in C order (strings for char variables: padded with NUL to the last dimension) */
  data: ArrayLike<number> | string | string[];
}

export interface NcFile {
  dims: { name: string; size: number }[];
  attrs?: NcAttrs;
  vars: NcVariable[];
}

const pad4 = (n: number) => (4 - (n % 4)) % 4;
const enc = new TextEncoder();

class Writer {
  buf = new Uint8Array(1 << 16);
  dv = new DataView(this.buf.buffer);
  n = 0;
  ensure(k: number) {
    if (this.n + k <= this.buf.length) return;
    let cap = this.buf.length;
    while (cap < this.n + k) cap *= 2;
    const b = new Uint8Array(cap);
    b.set(this.buf.subarray(0, this.n));
    this.buf = b;
    this.dv = new DataView(b.buffer);
  }
  u32(v: number) { this.ensure(4); this.dv.setUint32(this.n, v, false); this.n += 4; }
  i32(v: number) { this.ensure(4); this.dv.setInt32(this.n, v, false); this.n += 4; }
  u64(v: number) { this.ensure(8); this.dv.setUint32(this.n, Math.floor(v / 2 ** 32), false); this.dv.setUint32(this.n + 4, v >>> 0, false); this.n += 8; }
  f32(v: number) { this.ensure(4); this.dv.setFloat32(this.n, v, false); this.n += 4; }
  f64(v: number) { this.ensure(8); this.dv.setFloat64(this.n, v, false); this.n += 8; }
  bytes(b: Uint8Array) { this.ensure(b.length); this.buf.set(b, this.n); this.n += b.length; }
  pad() { const k = pad4(this.n); this.ensure(k); this.n += k; } // zero padding (buffer is zero-initialised)
  name(s: string) { const b = enc.encode(s); this.u32(b.length); this.bytes(b); this.pad(); }
  out() { return this.buf.slice(0, this.n); }
}

function attrTyped(v: NcAttrValue): { type: NcType; values: number[] | Uint8Array } {
  if (typeof v === "string") return { type: "char", values: enc.encode(v) };
  if (typeof v === "number" || Array.isArray(v)) return { type: "double", values: Array.isArray(v) ? v : [v] };
  return { type: v.type, values: Array.isArray(v.values) ? v.values : [v.values] };
}

function writeValues(w: Writer, type: NcType, values: ArrayLike<number> | Uint8Array) {
  const n = values.length;
  switch (type) {
    case "char": w.bytes(values as Uint8Array); break;
    case "int": for (let i = 0; i < n; i++) w.i32(values[i]); break;
    case "float": for (let i = 0; i < n; i++) w.f32(values[i]); break;
    case "double": for (let i = 0; i < n; i++) w.f64(values[i]); break;
  }
  w.pad();
}

function writeAttrs(w: Writer, attrs: NcAttrs | undefined) {
  const entries = Object.entries(attrs ?? {});
  if (!entries.length) { w.u32(0); w.u32(0); return; } // ABSENT
  w.u32(NC_ATTRIBUTE); w.u32(entries.length);
  for (const [k, v] of entries) {
    const t = attrTyped(v);
    w.name(k);
    w.u32(TYPE_CODE[t.type]);
    w.u32(t.values.length);
    writeValues(w, t.type, t.values);
  }
}

/** Encode char data (string or strings, each padded with NUL to the last dimension). */
function charBytes(v: NcVariable, count: number, lastDim: number): Uint8Array {
  const out = new Uint8Array(count);
  const strs = typeof v.data === "string" ? [v.data] : (v.data as string[]);
  strs.forEach((s, i) => {
    const b = enc.encode(s);
    if (b.length > lastDim) throw new Error(`${v.name}: string longer than ${lastDim} bytes`);
    out.set(b, i * lastDim);
  });
  return out;
}

/** Serialise to a NetCDF-3 file. version 2 = 64-bit offset (default), 1 = classic. */
export function writeNetcdf3(f: NcFile, version: 1 | 2 = 2): Uint8Array {
  const dimIndex = new Map(f.dims.map((d, i) => [d.name, i]));
  for (const d of f.dims) if (!(d.size > 0)) throw new Error(`dimension ${d.name}: size must be > 0 (no record dimension)`);
  const shapes = f.vars.map((v) => v.dims.map((d) => {
    const i = dimIndex.get(d);
    if (i === undefined) throw new Error(`${v.name}: unknown dimension ${d}`);
    return f.dims[i].size;
  }));
  const counts = shapes.map((s) => s.reduce((a, b) => a * b, 1));
  const vsize = f.vars.map((v, k) => counts[k] * TYPE_SIZE[v.type] + pad4(counts[k] * TYPE_SIZE[v.type]));
  f.vars.forEach((v, k) => {
    const len = typeof v.data === "string" || Array.isArray(v.data) && typeof v.data[0] === "string" ? -1 : (v.data as ArrayLike<number>).length;
    if (v.type !== "char" && len !== counts[k]) throw new Error(`${v.name}: ${len} values for shape [${shapes[k]}]`);
  });
  const header = (begins: number[]) => {
    const w = new Writer();
    w.bytes(enc.encode("CDF")); w.bytes(new Uint8Array([version]));
    w.u32(0); // numrecs
    w.u32(NC_DIMENSION); w.u32(f.dims.length);
    for (const d of f.dims) { w.name(d.name); w.u32(d.size); }
    writeAttrs(w, f.attrs);
    w.u32(NC_VARIABLE); w.u32(f.vars.length);
    f.vars.forEach((v, k) => {
      w.name(v.name);
      w.u32(v.dims.length);
      for (const d of v.dims) w.u32(dimIndex.get(d)!);
      writeAttrs(w, v.attrs);
      w.u32(TYPE_CODE[v.type]);
      w.u32(Math.min(vsize[k], 2 ** 32 - 1));
      if (version === 2) w.u64(begins[k]); else w.u32(begins[k]);
    });
    return w.out();
  };
  const hlen = header(f.vars.map(() => 0)).length; // begin values do not change the header length
  const begins: number[] = [];
  let off = hlen;
  for (const s of vsize) { begins.push(off); off += s; }
  if (version === 1 && off > 2 ** 31 - 1) throw new Error("file too large for CDF-1");
  const w = new Writer();
  w.bytes(header(begins));
  f.vars.forEach((v, k) => {
    if (v.type === "char") {
      const last = shapes[k].length ? shapes[k][shapes[k].length - 1] : 1;
      writeValues(w, "char", charBytes(v, counts[k], last));
    } else writeValues(w, v.type, v.data as ArrayLike<number>);
  });
  return w.out();
}
