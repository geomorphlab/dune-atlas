// User-facing text: no implementation, failure-handling,
// internal or relict wording in any site or download string of either build. Used by
// tests/usertext.test.ts (Earth, tests/publictext.ts) and tests/mars/publictext.test.ts (Mars).
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { placesNoteHtml, type PlaceList } from "../src/core/search/places";

/** phrases a visitor should not meet (case-insensitive) */
export const DEV_PHRASES: [string, RegExp][] = [
  ["where the code runs", /\b(in|from) (your|the) browser\b/i],
  ["map library name", /\bMapLibre\b/i],
  ["tile encodings / tiling", /\bTerrarium\b|\bvector tiles\b|\btiles to zoom\b|\bzoom levels?\b|\boverzoom/i],
  ["storage", /\bfor compression\b|\blayers\.nc\b|\bzarr\b|\bpmtiles\b|\bchunks?\b/i],
  ["failure handling", /\bdoes not respond\b|\bare you offline\b|\bleft empty\b|\bfallback\b/i],
  ["internal decisions / files", /\bby the PI\b|\bdocs\/|\b\w+\.md\b|\blinspace\b|\bfixture\b|\bregistry\b/i],
  ["relict physics / values", /\blog[- ]law\b|\bz0\b|\bz₀\b|\b199 µm\b/i],
  ["reprojection detail", /\breprojected\b/i],
];
/** known strings outside this file (owned by registry/mars/generated/dunes.yaml): reported
 *  elsewhere with the new text; allowed until rebuilt, then removed here */
export const PENDING_OTHER_TRACK: string[] = [];
/** the "Get the whole grid" guide (bulk.*) explains the public Zarr stores and points to the licence file:
 *  storage words and file names are its subject there; every other rule applies */
const DATA_GUIDE = /^(E|M)?:?bulk\./;
const DATA_GUIDE_ALLOWED = new Set(["storage", "internal decisions / files"]);
/** download keys that are machine-readable names, not prose (file / variable names are expected there) */
const MACHINE = /^(E|M)?:?(metadata\.(files|aux\.[^.]+\.in_file|citation\.\d+\.id)|csv\.)/;

/** the naming notes of the place lists (registry/<body>/places.yaml `note`) are approved verbatim: not swept
 *  (as text and as rendered with their links) */
export const VERBATIM_NOTES: string[] = (["earth", "mars"] as const).flatMap((b) => {
  const doc = yaml.load(fs.readFileSync(path.resolve(__dirname, `../../registry/${b}/places.yaml`), "utf8")) as PlaceList;
  return doc.note ? [doc.note, placesNoteHtml({ ...doc, enabled: true, places: [{ id: "x", line1: "x", lat: 0, lon: 0, radius_km: 1, sources: ["x"] }] })] : [];
});

export function devPhraseHits(t: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [k, v0] of Object.entries(t)) {
    if (MACHINE.test(k)) continue;
    let v = v0.replace(/https?:\/\/\S+/g, "<link>");   // a link to a file (e.g. DATA_LICENSE.md) is not prose about files
    for (const p of [...PENDING_OTHER_TRACK, ...VERBATIM_NOTES]) v = v.split(p).join("");
    for (const [what, re] of DEV_PHRASES) if (!(DATA_GUIDE.test(k) && DATA_GUIDE_ALLOWED.has(what)) && re.test(v)) out.push(`${k} [${what}]: ${v.slice(Math.max(0, v.search(re) - 60), v.search(re) + 80)}`);
  }
  return out;
}
