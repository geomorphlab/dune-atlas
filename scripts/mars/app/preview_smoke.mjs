#!/usr/bin/env node
// Headless integration check of the Mars preview (no browser): with the data server running on the
// devroot (python scripts/serve_data.py staging/mars/devroot --port 8787) and, optionally, the Mars
// build served by `vite preview` (PREVIEW=http://127.0.0.1:4173), fetch what the app fetches:
// every registry source (zarr.json of each field pyramid and its levels, cells.zarr / cells-aux.zarr,
// one cells.zarr shard by range), the two PMTiles archives (header + one tile per zoom), CORS and
// Range support, and the built index.html and its assets.
// Usage: node scripts/mars/app/preview_smoke.mjs [--data http://127.0.0.1:8787] [--preview URL]
//        node scripts/mars/app/preview_smoke.mjs --data staging/mars/devroot   (file mode: same keys and
//        byte ranges read from disk, for sandboxes without sockets; CORS and the built app not checked)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.resolve("app/package.json"));
const YAML = require("yaml");
const { PMTiles, FetchSource } = await import(require.resolve("pmtiles"));

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DATA = arg("--data", "http://127.0.0.1:8787");
const PREVIEW = arg("--preview", process.env.PREVIEW);
const DS = "dune-atlas/mars/v1/datasets/fv3-beta1";
const ORIGIN = arg("--origin", "http://localhost:5173");
const out = { data: DATA, checks: [], failures: [] };
const ok = (name, pass, info = {}) => { out.checks.push({ name, pass, ...info }); if (!pass) out.failures.push(name); };

const FILE = !/^https?:/.test(DATA);
async function get(url, init = {}) {
  const t0 = performance.now();
  if (FILE) {
    const p = url.slice(DATA.length + 1);
    const fp = path.join(DATA, p);
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) return { r: { ok: false, status: 404, headers: new Map() }, body: new Uint8Array(), ms: 0 };
    let buf = fs.readFileSync(fp), status = 200;
    const m = /bytes=(\d+)-(\d*)/.exec(init.headers?.Range ?? "");
    if (m) { buf = buf.subarray(Number(m[1]), m[2] ? Number(m[2]) + 1 : undefined); status = 206; }
    return { r: { ok: true, status, headers: new Map([["access-control-allow-origin", "(file mode)"]]) }, body: new Uint8Array(buf), ms: 0 };
  }
  const r = await fetch(url, { ...init, headers: { Origin: ORIGIN, ...(init.headers ?? {}) } });
  const body = new Uint8Array(await r.arrayBuffer());
  return { r, body, ms: Math.round(performance.now() - t0) };
}
const json = async (url) => { const { r, body } = await get(url); return r.ok ? JSON.parse(new TextDecoder().decode(body)) : null; };

// registry sources
const regFiles = ["registry/mars/layers.yaml", ...fs.readdirSync("registry/mars/generated").filter((f) => /\.ya?ml$/.test(f)).map((f) => `registry/mars/generated/${f}`)];
const reg = { files: regFiles.map((f) => YAML.parse(fs.readFileSync(f, "utf8"))) };
reg.layers = reg.files.flatMap((r) => r?.layers ?? []);
const layers = (reg.layers ?? []).concat(...(reg.groups ?? []).map((g) => g.layers ?? []));
const sources = new Set();
JSON.stringify(reg, (k, v) => { if (k === "source" && typeof v === "string" && v.includes("/")) sources.add(v.replace("{dataset}", DS)); return v; });
for (const s of [...sources].filter((s) => s.endsWith(".zarr"))) {
  const root = await json(`${DATA}/${s}/zarr.json`);
  if (!root) { ok(`zarr ${s}`, false, { error: "zarr.json missing" }); continue; }
  const m = root.attributes?.multiscales;
  const ms = (m?.layout ?? m?.[0]?.datasets ?? m?.datasets ?? []).map((d) => d.asset ?? d.path);
  if (!ms.length && root.node_type === "array") ms.push("");
  let levelsOk = ms.length > 0, arrays = 0;
  for (const lv of ms) {
    const base = lv ? `${DATA}/${s}/${lv}` : `${DATA}/${s}`;
    const g = await json(`${base}/zarr.json`);
    if (!g) { levelsOk = false; continue; }
    // the level group's arrays (FILE mode: list the directory) each need their zarr.json
    if (FILE && g.node_type === "group") {
      const dir = path.join(DATA, base.slice(DATA.length + 1));
      for (const a of fs.readdirSync(dir).filter((x) => fs.existsSync(path.join(dir, x, "zarr.json")))) {
        arrays++;
        const meta = JSON.parse(fs.readFileSync(path.join(dir, a, "zarr.json"), "utf8"));
        // scalar arrays (spatial_ref) hold only the fill value; every other array needs chunk data
        if ((meta.shape?.length ?? 0) > 0 && !fs.existsSync(path.join(dir, a, "c"))) levelsOk = false;
      }
    }
  }
  ok(`zarr ${s}`, levelsOk, { levels: ms.length, arrays });
}
// cell stores
for (const s of [`${DS}/cells.zarr`, `${DS}/cells-aux.zarr`]) {
  const root = await json(`${DATA}/${s}/zarr.json`);
  ok(`store ${s}`, !!root, { series_vars: root?.attributes?.series_vars, ustar_method: root?.attributes?.ustar_method });
}
// one shard by range: CORS + 206
{
  const listing = await get(`${DATA}/${DS}/cells.zarr/`);
  const head = await get(`${DATA}/${DS}/cells.zarr/zarr.json`, { headers: { Range: "bytes=0-15" } });
  ok("range request (206) + CORS", head.r.status === 206 && head.r.headers.get("access-control-allow-origin") != null,
    { status: head.r.status, acao: head.r.headers.get("access-control-allow-origin"), listing: listing.r.status });
}
// pmtiles
for (const p of ["dune-atlas/mars/v1/dunes/dunes.pmtiles", "dune-atlas/mars/v1/basemaps/hrsc-mola-terrarium.pmtiles"]) {
  try {
    const src = FILE ? { getKey: () => p, getBytes: async (off, len) => { const fd = fs.openSync(path.join(DATA, p), "r"); const b = Buffer.alloc(len); const n = fs.readSync(fd, b, 0, len, off); fs.closeSync(fd); return { data: b.buffer.slice(b.byteOffset, b.byteOffset + n) }; } }
      : new FetchSource(`${DATA}/${p}`);
    const pm = new PMTiles(src);
    const h = await pm.getHeader();
    const tiles = [];
    for (let z = h.minZoom; z <= h.maxZoom; z++) {
      // a tile at Nili Patera (8.8N, 67.0E) in Web Mercator
      const n = 2 ** z, x = Math.floor((67.0 + 180) / 360 * n);
      const lr = 8.8 * Math.PI / 180, y = Math.floor((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n);
      const t = await pm.getZxy(z, x, y);
      tiles.push(t ? t.data.byteLength : 0);
    }
    ok(`pmtiles ${p}`, tiles.some((b) => b > 0), { minZoom: h.minZoom, maxZoom: h.maxZoom, tileType: h.tileType, bytesPerZoomAtNili: tiles });
  } catch (e) { ok(`pmtiles ${p}`, false, { error: String(e) }); }
}
// built app
if (PREVIEW) {
  const idx = await get(`${PREVIEW}/`);
  const html = new TextDecoder().decode(idx.body);
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  let all = idx.r.ok;
  for (const a of assets) { const r = await get(new URL(a, `${PREVIEW}/`).href); all &&= r.r.ok; }
  ok("built Mars app (index + assets)", all && /Mars/.test(html), { assets: assets.length, title: html.match(/<title>([^<]*)/)?.[1] });
  // the data base compiled into the bundle
  const js = await Promise.all(assets.filter((a) => a.endsWith(".js")).map(async (a) => new TextDecoder().decode((await get(new URL(a, `${PREVIEW}/`).href)).body)));
  ok("bundle points at the data server", js.some((s) => s.includes(DATA)), {});
}
out.registry_layers = layers.length;
out.n_checks = out.checks.length;
fs.mkdirSync("staging/mars/preview", { recursive: true });
fs.writeFileSync("staging/mars/preview/preview_smoke.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ n_checks: out.n_checks, failures: out.failures }, null, 0));
process.exit(out.failures.length ? 1 : 0);
