// Shared by tests/dunesonly.test.ts and tests/mars/dunesonly.test.ts ('Dunes only', PI round 5 item 6):
// an in-memory zarr v3 writer (bytes codec) for synthetic field pyramids and cell stores, and the checks of
// the masked virtual store (map/maskedstore.ts + map/dunemask.ts) against a real cell store and field store.
import { expect } from "vitest";
import * as zarr from "zarrita";
import { MaskedFieldStore } from "../src/map/maskedstore";
import { loadDuneMask, maskAtFactor, levelFactor, maskGrid, type DuneMask } from "../src/map/dunemask";
import { applyMask } from "../src/map/vectors";

type Key = `/${string}`;
export class MemStore implements zarr.AsyncReadable {
  files = new Map<string, Uint8Array>();
  async get(key: Key) { return this.files.get(key); }
  json(key: string, v: unknown) { this.files.set(key, new TextEncoder().encode(JSON.stringify(v))); }
  group(path: string, attrs: Record<string, unknown> = {}) { this.json(`${path}/zarr.json`, { zarr_format: 3, node_type: "group", attributes: attrs }); }
  /** C-order array, chunks along every dim (edge chunks full-size, padded with the fill value) */
  array(path: string, shape: number[], chunk: number[], dtype: "float32" | "uint8", data: ArrayLike<number>) {
    const fill = dtype === "float32" ? "NaN" : 0;
    this.json(`${path}/zarr.json`, { zarr_format: 3, node_type: "array", shape, data_type: dtype, chunk_grid: { name: "regular", configuration: { chunk_shape: chunk } },
      chunk_key_encoding: { name: "default", configuration: { separator: "/" } }, fill_value: fill, codecs: [{ name: "bytes", configuration: { endian: "little" } }], attributes: {} });
    const nc = shape.map((n, d) => Math.ceil(n / chunk[d]));
    const strides = shape.map((_, d) => shape.slice(d + 1).reduce((a, b) => a * b, 1));
    const cstr = chunk.map((_, d) => chunk.slice(d + 1).reduce((a, b) => a * b, 1));
    const total = chunk.reduce((a, b) => a * b, 1);
    const idx = (i: number, n: number[]) => n.map((_, d) => Math.floor(i / n.slice(d + 1).reduce((a, b) => a * b, 1)) % n[d]);
    for (let c = 0; c < nc.reduce((a, b) => a * b, 1); c++) {
      const ci = idx(c, nc);
      const buf = dtype === "float32" ? new Float32Array(total).fill(NaN) : new Uint8Array(total);
      for (let e = 0; e < total; e++) {
        const ei = idx(e, chunk), gi = ei.map((v, d) => ci[d] * chunk[d] + v);
        if (gi.some((v, d) => v >= shape[d])) continue;
        buf[ei.reduce((a, v, d) => a + v * cstr[d], 0)] = data[gi.reduce((a, v, d) => a + v * strides[d], 0)];
      }
      this.files.set(`${path}/c/${ci.join("/")}`, new Uint8Array(buf.buffer));
    }
  }
}

/** synthetic pyramid: level 0 = the cell grid ny x nx, level 1 = 2x block mean (rows floor(ny/2)); n thresholds */
export function syntheticCase(ny = 9, nx = 16, n = 3) {
  const dunes = new Uint8Array(ny * nx);
  for (const [y, x] of [[1, 3], [6, 14], [4, 0], [5, 1], [8, 8]]) dunes[y * nx + x] = 1;
  const cells = new MemStore();
  cells.group("", { grid: { lat0: 80, dlat: -20, lon0: -168.75, dlon: 22.5, ny, nx, cell_registration: "centre" } });
  cells.array("/dunes", [ny, nx], [ny, 8], "uint8", dunes);
  const field = new MemStore();
  field.group("");
  const v0 = Float32Array.from({ length: n * ny * nx }, (_, i) => i + 0.5);
  field.array("/0/dpm", [n, ny, nx], [n, 4, 8], "float32", v0);
  const ny1 = Math.floor(ny / 2), nx1 = nx / 2;
  const v1 = Float32Array.from({ length: n * ny1 * nx1 }, (_, i) => -(i + 0.25));
  field.array("/1/dpm", [n, ny1, nx1], [n, 4, 8], "float32", v1);
  return { dunes, cells, field, ny, nx, n, v0, v1, ny1, nx1 };
}

/** read a whole level of the virtual store with zarrita (as zarr-layer does) at threshold k */
export async function readVirtual(store: zarr.AsyncReadable, level: string, v: string, k: number): Promise<{ shape: number[]; data: Float32Array }> {
  const a = await zarr.open.v3(zarr.root(store).resolve(`${level}/${v}`), { kind: "array" });
  const r = (await zarr.get(a, a.shape.length === 3 ? [k, null, null] : [null, null])) as { data: Float32Array; shape: number[] };
  return { shape: r.shape, data: r.data };
}

/** values kept exactly in dune cells (block-any at coarse levels), NaN elsewhere */
export function expectMasked(got: ArrayLike<number>, src: ArrayLike<number>, mask: { data: Uint8Array }) {
  let kept = 0;
  for (let i = 0; i < got.length; i++) {
    if (mask.data[i]) { if (Number.isNaN(src[i])) expect(Number.isNaN(got[i])).toBe(true); else { expect(got[i]).toBe(src[i]); kept++; } }
    else expect(Number.isNaN(got[i]), `index ${i}`).toBe(true);
  }
  return kept;
}

export async function checkSynthetic() {
  const c = syntheticCase();
  const m = (await loadDuneMask(`mem://synthetic-${Math.random()}`, c.cells))!;
  expect(m.count).toBe(5);
  expect([m.ny, m.nx]).toEqual([c.ny, c.nx]);
  const store = new MaskedFieldStore(c.field, "dpm", null, null, async () => m);
  // level 0: exactly the dune cells, every threshold
  for (let k = 0; k < c.n; k++) {
    const r = await readVirtual(store, "0", "dpm", k);
    expect(r.shape).toEqual([c.ny, c.nx]);
    expect(expectMasked(r.data, c.v0.subarray(k * c.ny * c.nx, (k + 1) * c.ny * c.nx), m)).toBe(5);
  }
  // level 1 (2x2 blocks, last row trimmed): a pixel is kept where its block holds a dune cell
  expect(levelFactor(m, [c.n, c.ny1, c.nx1])).toBe(2);
  const L1 = maskAtFactor(m, 2);
  expect([L1.ny, L1.nx]).toEqual([c.ny1, c.nx1]);
  expect(Array.from(L1.data).reduce((a, b) => a + b, 0)).toBe(3);   // (1,3)->(0,1); (6,14)->(3,7); (4,0),(5,1)->(2,0); row 8 trimmed
  const r1 = await readVirtual(store, "1", "dpm", 1);
  expect(expectMasked(r1.data, c.v1.subarray(c.ny1 * c.nx1, 2 * c.ny1 * c.nx1), L1)).toBe(3);
  // without a provider the store is a plain direction-mask store (unchanged behaviour)
  const plain = new MaskedFieldStore(c.field, "dpm", c.field, "dpm", null);
  const rp = await readVirtual(plain, "0", "dpm", 0);
  expect(Array.from(rp.data)).toEqual(Array.from(c.v0.subarray(0, c.ny * c.nx)));
  // arrows / streamlines: the level mask as a grid; applyMask leaves directions only in dune cells
  const g = maskGrid(m, 2);
  expect([g.lon0, g.lat0, g.dlon, g.dlat]).toEqual([-168.75 + 11.25, 80 - 10, 45, -40]);
  const dir = { data: new Float32Array(g.nx * g.ny).fill(1), nx: g.nx, ny: g.ny, lon0: g.lon0, lat0: g.lat0, dlon: g.dlon, dlat: g.dlat };
  applyMask(dir, g);
  expect(Array.from(dir.data).filter(Number.isFinite).length).toBe(3);
  return m;
}

/** a real cell store (dune flag) + field pyramid: the virtual store keeps exactly the dune cells */
export async function checkRealStores(cells: zarr.AsyncReadable, field: zarr.AsyncReadable, v: string, k: number, label: string): Promise<DuneMask & { kept: number; finite: number }> {
  const m = (await loadDuneMask(`file://${label}`, cells))!;
  expect(m).not.toBeNull();
  const raw = await readVirtual(field, "0", v, k);
  expect(raw.shape).toEqual([m.ny, m.nx]);                    // the field's level 0 is the cell grid
  const store = new MaskedFieldStore(field, v, null, null, async () => m);
  const got = await readVirtual(store, "0", v, k);
  const kept = expectMasked(got.data, raw.data, m);
  const finite = Array.from(raw.data).filter(Number.isFinite).length;
  // a fixture whose pyramid holds no chunks (metadata only) checks nothing: say so
  if (!finite) console.warn(`[dunes-only] ${label}: ${v} level 0 holds no data; masking check is vacuous`);
  return Object.assign(m, { kept, finite });
}
