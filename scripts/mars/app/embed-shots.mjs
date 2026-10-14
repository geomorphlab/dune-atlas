// Embed layout check with screenshots (PI round 7 item 2). Run on a desktop: the agent sandbox
// cannot start Chrome. Serves a built atlas (Earth app/dist or Mars app/dist-mars) from disk; the
// data come from the build's data base (live R2 unless VITE_DATA_BASE was changed).
//
//   cd app && npm run build && VITE_BODY=mars VITE_BASE=/mars/ npx vite build --outDir dist-mars
//   npm i --no-save playwright-core
//   node ../scripts/mars/app/embed-shots.mjs --dist dist --base / --out ../staging/mars-app/embed/earth
//   node ../scripts/mars/app/embed-shots.mjs --dist dist-mars --base /mars/ --out ../staging/mars-app/embed/mars
//        [--chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
//
// Shots: ?embed=1 at 360, 480, 640, 800 px wide (600 px high, the Google Sites frame) and full screen
// at 1280 x 800, panel collapsed (default) and opened. report.json: per shot the boxes of the pill,
// panel and top-right controls, overlaps, and the line count of each panel row (1 = no wrap).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const dist = path.resolve(arg("dist", "dist"));
const base = arg("base", "/");
const out = path.resolve(arg("out", "../staging/mars-app/embed"));
fs.mkdirSync(out, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };

const browser = await chromium.launch({ executablePath: arg("chrome", undefined), headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const report = [];
for (const [w, h, embed] of [[360, 600, true], [480, 600, true], [640, 600, true], [800, 600, true], [1280, 800, false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.route("http://atlas.local/**", (r) => {
    let p = decodeURIComponent(new URL(r.request().url()).pathname);
    if (p.startsWith(base)) p = "/" + p.slice(base.length);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(dist, p);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404 });
    r.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] ?? "application/octet-stream" });
  });
  const page = await ctx.newPage();
  await page.goto(`http://atlas.local${base}${embed ? "?embed=1" : "?tour=0"}`);
  await page.waitForSelector("#layer-panel .atlas-header");
  await page.waitForTimeout(4000);
  for (const open of [false, true]) {
    if (open !== await page.evaluate(() => !document.getElementById("layer-panel").classList.contains("collapsed"))) await page.click("#layer-panel .panel-toggle");
    await page.waitForTimeout(500);
    const name = `${w}${embed ? "_embed" : ""}_${open ? "open" : "collapsed"}.png`;
    await page.screenshot({ path: path.join(out, name) });
    const m = await page.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
      const lines = (s) => { const e = document.querySelector(s); if (!e) return null; const lh = parseFloat(getComputedStyle(e).lineHeight) || 1.2 * parseFloat(getComputedStyle(e).fontSize); return Math.round(e.getBoundingClientRect().height / lh); };
      const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const pill = box(".embed-bar"), panel = box("#layer-panel"), tr = box(".maplibregl-ctrl-top-right");
      return { pill, panel, topRight: tr, overlap: { pill_panel: hit(pill, panel), pill_controls: hit(pill, tr), panel_controls: hit(panel, tr) },
        rows: { title: box(".title-row")?.h, dataset: box(".dataset-row")?.h, dunesOnly: box(".dunes-only-row")?.h, sliderHead: box(".pinned .threshold-head")?.h, readout: box(".pinned .threshold-readout")?.h, helpLines: lines(".pinned .threshold > .help") },
        noteShown: !!document.querySelector(".embed-note") && getComputedStyle(document.querySelector(".embed-note")).display !== "none" };
    });
    report.push({ shot: name, ...m });
  }
  await ctx.close();
}
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 1));
await browser.close();
console.log(JSON.stringify(report.map((r) => ({ shot: r.shot, overlap: r.overlap, rows: r.rows })), null, 1));
