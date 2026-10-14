// Live check of the esri-mars:// protocol against the real OnMars services (node: real fetch, stub canvas).
// Usage (needs network; behind a proxy set NODE_USE_ENV_PROXY=1): cd app && npx vite-node ../scripts/mars/app/esri_live_smoke.ts
// Prints, per service, the tiling check and per test tile: rows drawn, source requests, missing, skipped, time.
import { esriTile, ESRI_STATS, ESRI_SERVICES, tilingMismatch, type EsriEnv } from "../../../app/src/bodies/mars/map/esri";
const warnings: string[] = [];
const env: EsriEnv = {
  base: "https://astro.arcgis.com/arcgis/rest/services/OnMars", fetch: (...a) => fetch(...a),
  decode: async (b) => { if (!/^image\//.test(b.type)) throw new Error(`not an image: ${b.type}`); return { width: 512, height: 512, opaque: true, close() {} } as unknown as ImageBitmap; },
  canvas: (w, h) => { let d = 0; return { getContext: () => ({ imageSmoothingEnabled: true, drawImage: () => { d++; }, getImageData: (_x: number, _y: number, ww: number, hh: number) => ({ data: new Uint8ClampedArray(ww * hh * 4).fill(255) }) }), transferToImageBitmap: () => ({ w, h, draws: d }) as unknown as ImageBitmap }; },
  warn: (m) => warnings.push(m),
};
const tileOf = (lat: number, lon: number, z: number) => { const n = 2 ** z, x = Math.floor((lon + 180) / 360 * n), r = lat * Math.PI / 180; return [x, Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)]; };
for (const s of Object.keys(ESRI_SERVICES)) {
  const d = await (await fetch(`${env.base}/${s}/MapServer?f=json`)).json();
  console.log(s, "tiling", tilingMismatch(d, ESRI_SERVICES[s].maxLevel) ?? "ok");
  for (const [lat, lon, z] of [[9, 67, 6], [9, 67, ESRI_SERVICES[s].maxLevel + 1], [-22.54, 10.77, 12], [-47.4, 30.4, 9]]) {
    const [x, y] = tileOf(lat, lon, z);
    const before = { ...ESRI_STATS };
    const t0 = performance.now();
    const t = await esriTile(`esri-mars://${s}/${z}/${x}/${y}`, new AbortController().signal, env) as unknown as { draws: number };
    console.log(`  ${lat},${lon} z${z}: draws ${t.draws} requests ${ESRI_STATS.sourceRequests - before.sourceRequests} missing ${ESRI_STATS.sourceMissing - before.sourceMissing} skipped ${ESRI_STATS.sourceSkipped - before.sourceSkipped} ${Math.round(performance.now() - t0)} ms`);
  }
}
console.log("warnings", warnings);
