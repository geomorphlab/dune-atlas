// User-facing text (PI round 7 item 3; docs/user-text-audit.md): no implementation, failure-handling,
// internal or relict wording in any site or download string of either build. Used by
// tests/usertext.test.ts (Earth, tests/publictext.ts) and tests/mars/publictext.test.ts (Mars).

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
/** known strings outside the App track (Terrain owns registry/mars/generated/dunes.yaml): reported
 *  to Terrain with the new text (docs/user-text-audit.md); allowed until rebuilt, then removed here */
export const PENDING_OTHER_TRACK: string[] = [];
/** download keys that are machine-readable names, not prose (file / variable names are expected there) */
const MACHINE = /^(E|M)?:?(metadata\.(files|aux\.[^.]+\.in_file|citation\.\d+\.id)|csv\.)/;

export function devPhraseHits(t: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [k, v0] of Object.entries(t)) {
    if (MACHINE.test(k)) continue;
    let v = v0;
    for (const p of PENDING_OTHER_TRACK) v = v.split(p).join("");
    for (const [what, re] of DEV_PHRASES) if (re.test(v)) out.push(`${k} [${what}]: ${v.slice(Math.max(0, v.search(re) - 60), v.search(re) + 80)}`);
  }
  return out;
}
