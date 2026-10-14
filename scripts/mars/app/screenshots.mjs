// Headless screenshots of the Mars atlas (run on a machine that can launch
// Chrome). No servers needed: Playwright serves the built app (app/dist-mars) and a data directory
// (fixture or devroot) through request interception, with HTTP Range and CORS like R2.
//
//   cd app && VITE_BODY=mars VITE_DATA_BASE=http://data.local npx vite build
//   npm i --no-save playwright-core   (or: npx -y -p playwright-core node ...)
//   node ../scripts/mars/app/screenshots.mjs --data ../staging/fixture-mars --out ../staging/mars-app/shots \
//        [--chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
//
// Shots: default view (globe), Nili Patera cell panel, Mercator + OpenPlanetaryMap, Esri CTX at Nili Patera
// and Proctor with the dunes, and the map PNG export (downloaded through the Export button: proves the canvas
// is not tainted). Writes shots/report.json with console errors and Esri request statistics.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const dist = path.resolve(arg("dist", "dist-mars"));
const data = path.resolve(arg("data", "../staging/fixture-mars"));
const out = path.resolve(arg("out", "../staging/mars-app/shots"));
fs.mkdirSync(out, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

const browser = await chromium.launch({ executablePath: arg("chrome", undefined), headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
await ctx.route("http://atlas.local/**", (r) => {
  let p = decodeURIComponent(new URL(r.request().url()).pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(dist, p);
  if (!fs.existsSync(f)) return r.fulfill({ status: 404 });
  r.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] ?? "application/octet-stream" });
});
await ctx.route("http://data.local/**", (r) => {
  const f = path.join(data, decodeURIComponent(new URL(r.request().url()).pathname));
  const cors = { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range, content-length" };
  if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: { ...cors, "access-control-allow-headers": "range" } });
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, headers: cors });
  const buf = fs.readFileSync(f), rng = r.request().headers()["range"];
  if (!rng) return r.fulfill({ status: 200, body: buf, headers: cors });
  const m = /bytes=(\d*)-(\d*)/.exec(rng);
  const [a, b] = m[1] === "" ? [buf.length - Number(m[2]), buf.length - 1] : [Number(m[1]), m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1];
  r.fulfill({ status: 206, body: buf.subarray(a, b + 1), headers: { ...cors, "content-range": `bytes ${a}-${b}/${buf.length}` } });
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text().slice(0, 300)); });
const idle = () => page.evaluate(() => new Promise((res) => { const m = window.duneAtlas.map; if (m.loaded() && !m.isMoving()) setTimeout(res, 1500); else m.once("idle", () => setTimeout(res, 1500)); }));
const shot = async (name, url) => { await page.goto(`http://atlas.local/${url}`); await page.waitForFunction(() => window.duneAtlas?.map); await idle(); await page.screenshot({ path: path.join(out, name) }); };
const report = { shots: [] };

await shot("01_default_globe.png", "");
report.shots.push("01_default_globe.png");
await shot("02_nili_patera_cell.png", "?lon=67&lat=9&zoom=4&proj=mercator&cell=40,123&layers=dunes:1,dpm:0.85&basemap=hrsc-mola-hillshade");
report.shots.push("02_nili_patera_cell.png");
await shot("03_opm_mercator.png", "?lon=67&lat=9&zoom=5&proj=mercator&layers=dunes:1&basemap=opm-mars");
report.shots.push("03_opm_mercator.png");
for (const [name, lon, lat, z] of [["nili", 67, 9, 8], ["proctor", 30.4, -47.4, 8], ["nili_globe", 67, 9, 5]]) {
  const t0 = Date.now();
  await shot(`04_esri_ctx1_${name}.png`, `?lon=${lon}&lat=${lat}&zoom=${z}&proj=${name.endsWith("globe") ? "globe" : "mercator"}&layers=dunes:0.6&basemap=esri-ctx1`);
  report.shots.push(`04_esri_ctx1_${name}.png`);
  report[`esri_${name}`] = { ...(await page.evaluate(() => ({ ...window.duneAtlas.esriStats }))), wall_ms: Date.now() - t0 };
}
// map PNG export through the UI (captureMap -> canvas.toBlob): fails if the canvas were tainted
await page.click(".atlas-tools .export-btn").catch(() => {});
const dl = page.waitForEvent("download", { timeout: 60000 }).catch((e) => e);
await page.getByRole("button", { name: /Export PNG/ }).click().catch(() => {});
const d = await dl;
if (d && d.saveAs) { await d.saveAs(path.join(out, "05_export_esri.png")); report.export = "ok"; } else report.export = `failed: ${d}`;
report.console = errors;
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 1));
await browser.close();
console.log(JSON.stringify(report, null, 1));
