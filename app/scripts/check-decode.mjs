// Verify the browser stack (zarrita + numcodecs.js) decodes our stores over HTTP range requests.
import * as zarr from "zarrita";
import fs from "node:fs";
const base = process.argv[2] ?? "http://127.0.0.1:8787";  // or a local directory path
const ref = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
let bytes = 0, reqs = 0;
// Range-read store: same get/getRange contract FetchStore uses over HTTP (Range header).
// Pass an http(s) base to use FetchStore against a real server (dev server or R2).
class RangeFileStore {
  constructor(root) { this.root = root; }
  async get(key) { const p = this.root + key; if (!fs.existsSync(p)) return undefined; reqs++; const b = fs.readFileSync(p); bytes += b.length; return new Uint8Array(b); }
  async getRange(key, range) {
    const p = this.root + key; if (!fs.existsSync(p)) return undefined;
    const size = fs.statSync(p).size; let off, len;
    if ("suffixLength" in range) { off = size - range.suffixLength; len = range.suffixLength; } else { off = range.offset; len = range.length; }
    const fd = fs.openSync(p, "r"); const buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, off); fs.closeSync(fd);
    reqs++; bytes += len; return new Uint8Array(buf);
  }
}
const mk = (path) => base.startsWith("http") ? new zarr.FetchStore(`${base}/${path}`) : new RangeFileStore(`${base}/${path}`);
const store = mk("cells.zarr");
const root = zarr.root(store);
const hist = await zarr.open(root.resolve("hist"), { kind: "array" });
const [y, x] = ref.cell;
const t0 = performance.now();
const h = await zarr.get(hist, [y, x, null, null]);
const t1 = performance.now();
let sum = 0n, wsum = 0n;
for (let i = 0; i < h.data.length; i++) { sum += BigInt(h.data[i]); wsum += BigInt(h.data[i]) * BigInt(i); }
const fields = await zarr.open(root.resolve("fields"), { kind: "array" });
const f = await zarr.get(fields, [y, x, null, null]);
const meta = (await zarr.open(root, { kind: "group" })).attrs;
const iQacb = meta.field_vars.indexOf("qacb"), iAt = meta.field_vars.indexOf("at");
const pyr = await zarr.open(zarr.root(mk("fields/qacb.zarr")).resolve("0/qacb"), { kind: "array" });
const p = await zarr.get(pyr, [14, 100, 50]);
const out = {
  hist_sum_ok: Number(sum) === ref.hist_sum, hist_wsum_ok: Number(wsum % 2147483648n) === ref.hist_wsum,
  qacb_ok: Math.abs(f.data[iQacb * 64 + 14] - ref.fields_qacb_ut14) < 1e-15,
  at_ok: Math.abs(f.data[iAt * 64 + 14] - ref.fields_at_ut14) < 1e-6,
  pyr_ok: Math.abs(p - ref.pyr_qacb_ut14_y100_x50) <= Math.abs(ref.pyr_qacb_ut14_y100_x50) * 2 ** -12,  // pyramids keep 12 mantissa bits
  hist_dtype: hist.dtype, first_cell_ms: Math.round(t1 - t0), requests: reqs, kB_transferred: Math.round(bytes / 1024),
};
console.log(JSON.stringify(out));
