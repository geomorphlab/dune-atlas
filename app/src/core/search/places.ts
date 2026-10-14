// Named places of the search box: the body's list (registry/<body>/places.yaml, schema
// registry/places.schema.json) and a fuzzy, diacritic-insensitive matcher over the Latin-script name
// (line1), the non-Latin name (line2) and the aliases. The named search is shown only when the
// list's `enabled` flag is true.
import yaml from "js-yaml";
import { placesFiles } from "@body/registry";

export interface Place {
  id: string;
  /** name in Latin script */
  line1: string;
  /** name in a non-Latin script, with its language (BCP 47) */
  line2?: { text: string; lang: string };
  /** feature type, shown with the name in the results (Mars: the IAU descriptor term, e.g. Crater) */
  type?: string;
  aliases?: string[];
  lat: number;
  lon: number;
  radius_km: number;
  /** mapped dune area of the place (km²): ranks equally good matches */
  dune_km2?: number;
  countries?: string[];
  sources: string[];
}
export interface PlaceList { enabled: boolean; places: Place[]; note?: string; credit?: string }

/** texts of the name labels ('Show names', map/placelabels.ts) */
export const PLACE_TEXT = {
  toggle: "Show names",
  toggleHelp: "Label named dune fields and features on the map: the largest first, smaller ones as you zoom in. Click a name for its details.",
  aliases: "Also called",
  dunes: "Mapped dune area",
  sources: "Sources",
  countries: "Countries",
  credit: "Feature names",
};

/** the body's place list (empty and disabled when the file is missing) */
export function loadPlaces(files: Record<string, string> = placesFiles): PlaceList {
  const text = Object.values(files)[0];
  const p = (text ? yaml.load(text) : null) as Partial<PlaceList> | null;
  return { enabled: !!p?.enabled, places: Array.isArray(p?.places) ? p!.places : [], ...(p?.note ? { note: p.note } : {}), ...(p?.credit ? { credit: p.credit } : {}) };
}

/** the list is shown (named search, name labels): enabled and not empty */
export const placesAvailable = (list: PlaceList) => list.enabled && list.places.length > 0;

/** the naming note of the dune layer's info: shown only with the named search, the list's own note if it has one */
export function placesNote(list: PlaceList): string {
  return placesAvailable(list) ? list.note ?? PLACES_DISCLAIMER : "";
}

/** The default naming note for the dune layer's info (Earth; draft, under review). */
export const PLACES_DISCLAIMER = "Dune-field names in the search are for navigation only. Many dune fields have several names, including Indigenous and local names; the names shown are those we could source, and they imply no position on naming or boundaries.";

/** Search key: lower case, without diacritics, apostrophes and ʿayn / hamza marks; other punctuation
 *  becomes a space. Non-Latin letters are kept (line2 matches in its own script). */
export function searchKey(s: string): string {
  return s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[ʿʾʻʼ'’‘`´]/g, "").replace(/ß/g, "ss").replace(/[æ]/g, "ae").replace(/[ø]/g, "o").replace(/[ł]/g, "l").replace(/[đ]/g, "d").replace(/[ı]/g, "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Damerau-Levenshtein (optimal string alignment) distance, with an early exit above `max` */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev2: number[] = [], prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[n];
}

/** Score of query key `q` against one name key `name` (0 = no match). */
export function nameScore(q: string, name: string): number {
  if (!q || !name) return 0;
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  const words = name.split(" ");
  if (words.some((w) => w.startsWith(q))) return 80;
  const qw = q.split(" ");
  if (qw.length > 1 && qw.every((x) => words.some((w) => w.startsWith(x)))) return 75;
  if (q.length >= 3 && name.includes(q)) return 70;
  // typing errors: whole name, or each query word against the name's words (prefix of the same length)
  if (q.length >= 4) {
    const tol = q.length >= 8 ? 2 : 1;
    const d = Math.min(editDistance(q, name, tol), editDistance(q, name.slice(0, q.length), tol));
    if (d <= tol) return 60 - 5 * d;
    const per = qw.every((x) => x.length < 3 || words.some((w) => editDistance(x, w.slice(0, Math.max(x.length, Math.min(w.length, x.length + 1))), x.length >= 6 ? 2 : 1) <= (x.length >= 6 ? 2 : 1)));
    if (per && qw.some((x) => x.length >= 4)) return 50;
  }
  return 0;
}

export interface PlaceHit { place: Place; score: number; matched: string }

/** Places matching `query` (best first, at most `limit`): over line1, line2 and the aliases; equally good
 *  matches by mapped dune area (largest first), then by name. */
export function matchPlaces(query: string, places: Place[], limit = 8): PlaceHit[] {
  const q = searchKey(query);
  if (!q) return [];
  const hits: PlaceHit[] = [];
  for (const p of places) {
    let best = 0, matched = p.line1;
    for (const n of [p.line1, p.line2?.text, ...(p.aliases ?? [])]) {
      if (!n) continue;
      const s = nameScore(q, searchKey(n)) - (n === p.line1 ? 0 : 1);   // a tie goes to the main name
      if (s > best) { best = s; matched = n; }
    }
    if (best > 0) hits.push({ place: p, score: best, matched });
  }
  return hits.sort((a, b) => b.score - a.score || (b.place.dune_km2 ?? 0) - (a.place.dune_km2 ?? 0) || a.place.line1.localeCompare(b.place.line1)).slice(0, limit);
}

/** [west, south, east, north] around a place (its radius on a sphere of radius `radiusKm`), for fitBounds */
export function placeBounds(p: Pick<Place, "lat" | "lon" | "radius_km">, radiusKm: number): [number, number, number, number] {
  const dLat = (p.radius_km / radiusKm) * (180 / Math.PI);
  const c = Math.cos((Math.min(Math.abs(p.lat) + dLat, 89) * Math.PI) / 180);
  const dLon = Math.min(180, dLat / Math.max(c, 0.05));
  const lon = p.lon > 180 ? p.lon - 360 : p.lon;
  return [lon - dLon, Math.max(-85, p.lat - dLat), lon + dLon, Math.min(85, p.lat + dLat)];
}
