// Direction-validity mask for the colour-map rendering of directional fields. zarr-layer renders
// one variable from one store, so the mask (paired magnitude field <= 0 or NaN -> no data) is
// applied in a virtual zarr store handed to zarr-layer: it serves the direction store
// unchanged, except that each level's direction array is re-described as UNSHARDED and
// uncompressed with chunk = the source's inner chunk (1 threshold x rows x cols), and every
// chunk is produced by decoding the matching window of the direction and mask arrays (same
// level, same threshold) and writing NaN where the mask is not > 0. Same rule as the arrows /
// streamlines (applyMask) and the side panel (modeDefined).
import * as zarr from "zarrita";

type Readable = zarr.AsyncReadable;
type Key = `/${string}`;
interface ArrayMeta { shape: number[]; chunk_grid: { configuration: { chunk_shape: number[] } }; codecs: { name: string; configuration?: { chunk_shape?: number[] } }[]; [k: string]: unknown }
interface LevelInfo { shape: number[]; chunk: number[] }

/** Value kept where the mask is valid (> 0, finite); NaN elsewhere. */
export function maskValue(v: number, m: number): number {
  return m > 0 && Number.isFinite(m) ? v : NaN;
}

export class MaskedFieldStore implements Readable {
  #levels = new Map<string, Promise<LevelInfo>>();
  #dirArrays = new Map<string, Promise<zarr.Array<zarr.DataType, Readable>>>();
  #maskArrays = new Map<string, Promise<zarr.Array<zarr.DataType, Readable>>>();
  constructor(private dir: Readable, private dirVar: string, private mask: Readable, private maskVar: string) {}

  static fromUrls(dirUrl: string, dirVar: string, maskUrl: string, maskVar: string): MaskedFieldStore {
    return new MaskedFieldStore(new zarr.FetchStore(dirUrl, { useSuffixRequest: true }), dirVar, new zarr.FetchStore(maskUrl, { useSuffixRequest: true }), maskVar);
  }

  #parse(key: string): { level: string; rest: string } | null {
    const m = key.match(/^\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!m || m[2] !== this.dirVar) return null;
    return { level: m[1], rest: m[3] };
  }

  async #rawMeta(level: string): Promise<ArrayMeta> {
    const b = await this.dir.get(`/${level}/${this.dirVar}/zarr.json` as Key);
    if (!b) throw new Error(`no array ${level}/${this.dirVar}`);
    return JSON.parse(new TextDecoder().decode(b)) as ArrayMeta;
  }

  #level(level: string): Promise<LevelInfo> {
    let p = this.#levels.get(level);
    if (!p) {
      p = this.#rawMeta(level).then((m) => {
        const shard = m.codecs.find((c) => c.name === "sharding_indexed");
        const chunk = [...(shard?.configuration?.chunk_shape ?? m.chunk_grid.configuration.chunk_shape)];
        chunk[0] = 1; // one threshold per chunk (dims ut, y, x)
        return { shape: m.shape, chunk };
      });
      this.#levels.set(level, p);
    }
    return p;
  }

  #open(cache: Map<string, Promise<zarr.Array<zarr.DataType, Readable>>>, store: Readable, path: string) {
    let p = cache.get(path);
    if (!p) { p = zarr.open.v3(zarr.root(store).resolve(path), { kind: "array" }); cache.set(path, p); }
    return p;
  }

  async get(key: Key, opts?: unknown): Promise<Uint8Array | undefined> {
    const k = this.#parse(key);
    if (!k) return this.dir.get(key, opts as never);
    if (k.rest === "zarr.json") {
      const m = await this.#rawMeta(k.level);
      const L = await this.#level(k.level);
      const out = { ...m, chunk_grid: { name: "regular", configuration: { chunk_shape: L.chunk } }, codecs: [{ name: "bytes", configuration: { endian: "little" } }] };
      return new TextEncoder().encode(JSON.stringify(out));
    }
    const c = k.rest.match(/^c\/(\d+(?:\/\d+)*)$/);
    if (!c) return this.dir.get(key, opts as never);
    const idx = c[1].split("/").map(Number);
    return this.chunk(k.level, idx);
  }

  async getRange(key: Key, range: zarr.RangeQuery, opts?: unknown): Promise<Uint8Array | undefined> {
    if (this.#parse(key)) throw new Error("range read of a virtual masked array");
    return this.dir.getRange?.(key, range, opts as never);
  }

  /** Masked chunk `idx` (ut, cy, cx) of level `level` as little-endian float32 bytes. */
  async chunk(level: string, idx: number[]): Promise<Uint8Array> {
    const L = await this.#level(level);
    const sel = idx.map((ci, d) => {
      const a = ci * L.chunk[d];
      return [a, Math.min(a + L.chunk[d], L.shape[d])] as const;
    });
    const [dirA, maskA] = await Promise.all([
      this.#open(this.#dirArrays, this.dir, `${level}/${this.dirVar}`),
      this.#open(this.#maskArrays, this.mask, `${level}/${this.maskVar}`),
    ]);
    if (maskA.shape.some((n, d) => n !== L.shape[d])) throw new Error(`mask ${this.maskVar} level ${level} shape ${maskA.shape} != ${L.shape}`);
    const s = [sel[0][0], zarr.slice(sel[1][0], sel[1][1]), zarr.slice(sel[2][0], sel[2][1])] as const;
    const [dv, mv] = (await Promise.all([zarr.get(dirA, s as never), zarr.get(maskA, s as never)])) as { data: ArrayLike<number> }[];
    const d = dv.data, m = mv.data;
    const h = sel[1][1] - sel[1][0], w = sel[2][1] - sel[2][0];
    const [ch, cw] = [L.chunk[1], L.chunk[2]];
    const out = new Float32Array(ch * cw).fill(NaN); // edge chunks are full-size in zarr v3
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * cw + x] = maskValue(d[y * w + x], m[y * w + x]);
    return new Uint8Array(out.buffer);
  }
}
