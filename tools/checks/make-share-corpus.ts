// Share-link corpus (refactor gate): the default view and 40 seeded random view states of one atlas,
// each with its short-link code (#v=…), the decoded state and the app state the atlas opens with.
// Generated ONCE from the baseline build and committed; tests/sharecorpus.test.ts (Earth) and
// tests/mars/sharecorpus.test.ts (Mars) assert that the current code encodes, decodes and opens
// every entry identically, so links shared before a refactor keep working unchanged.
// Run from app/:
//   npx vite-node ../tools/checks/make-share-corpus.ts -- tests/fixtures/share-links-earth.json
//   VITE_BODY=mars npx vite-node ../tools/checks/make-share-corpus.ts -- tests/fixtures/share-links-mars.json
import fs from "node:fs";
import { loadRegistry } from "../../app/src/core/registry/load";
import { BODY } from "../../app/src/core/body";
import { DEFAULT_VIEW } from "../../app/src/core/defaultview";
import { SHARE_IDS, encodeShare } from "../../app/src/core/share/shortlink";
import { SPACING_KM_STEPS, type LayerConfig } from "../../app/src/core/layerconfig";
import { openShareCode } from "../../app/tests/shareopen";

const out = process.argv.slice(2).filter((a) => a !== "--")[0];
let seed = BODY === "mars" ? 20261015 : 20261014;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const round = (v: number, d: number) => Number(v.toFixed(d));

const reg = loadRegistry().registry;
const layerIds = reg.layers.map((l) => l.id), basemaps = reg.basemaps.map((b) => b.id);
const datasets = (reg.datasets ?? []).map((d) => d.id);
const nCtl = reg.threshold.values?.length ?? 64;
const states = [DEFAULT_VIEW];
for (let i = 0; i < 40; i++) {
  const n = Math.floor(rnd() * 5);
  const ids = [...layerIds].sort(() => rnd() - 0.5).slice(0, n);
  states.push({
    lon: round(rnd() * 360 - 180, 4), lat: round(rnd() * 170 - 85, 4), zoom: round(rnd() * 8, 2),
    ...(rnd() < 0.2 ? { bearing: round(rnd() * 40 - 20, 1), pitch: 0 } : {}),
    proj: rnd() < 0.5 ? "globe" : "mercator", dataset: pick(datasets), basemap: pick(basemaps), ut: Math.floor(rnd() * nCtl),
    layers: ids.map((id) => {
      const cfg: LayerConfig = {};
      if (rnd() < 0.3) cfg.colormap = pick(SHARE_IDS.colormaps);
      if (rnd() < 0.2) cfg.reverse = true;
      if (rnd() < 0.3) { const a = round(rnd() * 10, 3); cfg.clim = [a, round(a + 0.5 + rnd() * 100, 3)]; }
      if (rnd() < 0.2) cfg.log = rnd() < 0.5;
      if (rnd() < 0.15) cfg.mode = pick(["arrows", "streamlines"] as const);
      if (rnd() < 0.1) cfg.vecColor = "#" + Math.floor(rnd() * 0xffffff).toString(16).padStart(6, "0");
      if (rnd() < 0.1) cfg.spacingKm = pick(SPACING_KM_STEPS);
      if (rnd() < 0.1) cfg.fill = "#" + Math.floor(rnd() * 0xffffff).toString(16).padStart(6, "0");
      if (rnd() < 0.1) cfg.invert = true;
      return { id, opacity: round(rnd(), 2), ...(Object.keys(cfg).length ? { cfg } : {}) };
    }),
    cell: rnd() < 0.5 ? [Math.floor(rnd() * 90), Math.floor(rnd() * 180)] : null,
    panel: rnd() < 0.5,
    ...(rnd() < 0.3 ? { dunesOnly: true } : {}),
    ...(rnd() < 0.3 ? { plotY: pick([...SHARE_IDS.plots, ...(BODY === "mars" ? ["rho_mean"] : [])]) } : {}),
  });
}
const corpus = states.map((state) => { const code = encodeShare(state); return { state, code, ...openShareCode(reg, code) }; });
fs.writeFileSync(out, JSON.stringify({ body: BODY, entries: corpus }, null, 1) + "\n");
console.log(`${out}: ${corpus.length} entries`);
