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
  /** other names with a note on their script, meaning and language (searchable; popup) */
  alt_names?: { text: string; note?: string }[];
  /** named parts of the area (popup 'Includes'; their names are in `aliases`) */
  includes?: string[];
  lat: number;
  lon: number;
  radius_km: number;
  /** mapped dune area of the place (km²): ranks equally good matches */
  dune_km2?: number;
  countries?: string[];
  sources: string[];
}
export interface PlaceList {
  enabled: boolean; places: Place[];
  /** the naming note (verbatim) and the parts of it shown as links */
  note?: string; note_links?: { text: string; href: string }[];
  /** source line of map image exports while the names are shown */
  credit?: string;
}

/** texts of the name labels ('Show names', map/placelabels.ts) */
export const PLACE_TEXT = {
  toggle: "Names",
  toggleHelp: "Label named dune fields and features on the map; where names would overlap, some appear only as you zoom in. Click a name for its details.",
  aliases: "Also called",
  includes: "Includes",
  aboutNames: "About these names",
  aboutItem: "Dune-field names",
  sources: "Sources",
  countries: "Countries",
  credit: "Feature names",
};

/** the body's place list (empty and disabled when the file is missing) */
export function loadPlaces(files: Record<string, string> = placesFiles): PlaceList {
  const text = Object.values(files)[0];
  const p = (text ? yaml.load(text) : null) as Partial<PlaceList> | null;
  return { enabled: !!p?.enabled, places: Array.isArray(p?.places) ? p!.places : [], ...(p?.note ? { note: p.note } : {}), ...(p?.note_links ? { note_links: p.note_links } : {}), ...(p?.credit ? { credit: p.credit } : {}) };
}

/** the list is shown (named search, name labels): enabled and not empty */
export const placesAvailable = (list: PlaceList) => list.enabled && list.places.length > 0;

/** the naming note (verbatim text of the list): shown only with the named search */
export function placesNote(list: PlaceList): string {
  return placesAvailable(list) ? list.note ?? "" : "";
}
/** the naming note as HTML: the text escaped, its `note_links` (first occurrence each) as links */
export function placesNoteHtml(list: PlaceList): string {
  const text = placesNote(list);
  if (!text) return "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let html = esc(text);
  for (const l of list.note_links ?? []) {
    const e = esc(l.text);
    const ext = l.href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"';
    html = html.replace(e, `<a href="${esc(l.href)}"${ext}>${e}</a>`);
  }
  return html;
}


/** Search key: lower case, without diacritics, apostrophes and ʿayn / hamza marks; other punctuation
 *  becomes a space. Non-Latin letters are kept (line2 matches in its own script). */
export function searchKey(s: string): string {
  return s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[ʿʾʻʼ'’‘`´]/g, "").replace(/ß/g, "ss").replace(/[æ]/g, "ae").replace(/[ø]/g, "o").replace(/[ł]/g, "l").replace(/[đ]/g, "d").replace(/[ı]/g, "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** generic landform and descriptor words (after searchKey): two names that differ only in these, in case,
 *  diacritics, punctuation or spacing ('Dune Field' / 'dunefield', 'Sand Hills' / 'Sandhills', 'Gale crater' /
 *  'Gale Crater Dune Field') are the same name */
const GENERIC_WORDS = /\b(?:the|of|coastal|aeolian|eolian|sand|sands|sandy|dune|dunes|dunefield|dunefields|field|fields|sandhill|sandhills|hill|hills|sea|seas|land|desert|deserts|erg|ergs|belt|region|area|massif|plain)\b/g;
/** key under which variants of one name compare equal (see GENERIC_WORDS) */
export function nameVariantKey(s: string): string {
  return searchKey(s).replace(GENERIC_WORDS, " ").replace(/\s+/g, "");
}
/** the other names worth showing (popup 'Also called'): the alternative names, else the aliases, without
 *  those that differ from line 1 (or from an earlier one) only by the generic words, case, diacritics,
 *  punctuation or spacing; search still uses every name (searchNames) */
export function otherNames(p: Place): { text: string; note?: string }[] {
  const seen = new Set([nameVariantKey(p.line1)]);
  const all = p.alt_names?.length ? p.alt_names : (p.aliases ?? []).filter((a) => !(p.includes ?? []).some((i) => i === a || i.startsWith(`${a} (`) || i.endsWith(`(${a})`))).map((text) => ({ text }));
  return all.filter((a) => {
    const k = nameVariantKey(a.text);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
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

/** what a hit matched: the name (line 1 or 2), another name (alias, alternative name, sub-unit) or a country */
export type HitKind = "name" | "alias" | "country";
export interface PlaceHit { place: Place; score: number; matched: string; kind: HitKind }

/** the names a place is found by: line 1, line 2, the aliases (incl. sub-units) and the alternative names */
export function searchNames(p: Place): string[] {
  return [p.line1, ...(p.line2 ? [p.line2.text] : []), ...(p.aliases ?? []), ...(p.alt_names ?? []).map((a) => a.text)];
}
/** a country or territory typed in full ranks above partial name matches (85); its start below every name
 *  match (40); the places of a country then follow their mapped dune area */
export const COUNTRY_SCORE = { exact: 85, partial: 40 } as const;
const KEYS = new WeakMap<Place, { names: [string, string][]; countries: [string, string][] }>();
function keysOf(p: Place) {
  let k = KEYS.get(p);
  if (!k) KEYS.set(p, (k = { names: searchNames(p).map((n) => [n, searchKey(n)]), countries: (p.countries ?? []).map((c) => [c, searchKey(c)]) }));
  return k;
}

/** Places matching `query` (best first, at most `limit`): over line1, line2, the aliases and alternative
 *  names (typing errors tolerated), then the countries (whole words or their start); equally good matches by
 *  mapped dune area (largest first), then by name. */
export function matchPlaces(query: string, places: Place[], limit = 8): PlaceHit[] {
  const q = searchKey(query);
  if (!q) return [];
  const hits: PlaceHit[] = [];
  for (const p of places) {
    const k = keysOf(p);
    let best = 0, matched = p.line1, kind: HitKind = "name";
    for (const [n, key] of k.names) {
      const main = n === p.line1 || n === p.line2?.text;
      const s = nameScore(q, key) - (n === p.line1 ? 0 : 1);   // a tie goes to the main name
      if (s > best) { best = s; matched = n; kind = main ? "name" : "alias"; }
    }
    if (q.length >= 3) {
      for (const [c, key] of k.countries) {
        const s = key === q ? COUNTRY_SCORE.exact : nameScore(q, key) >= 80 ? COUNTRY_SCORE.partial : 0;
        if (s > best) { best = s; matched = c; kind = "country"; }
      }
    }
    // a spelling-only variant of line 1 (nameVariantKey) is reported as the name itself
    if (kind === "alias" && nameVariantKey(matched) === nameVariantKey(p.line1)) { matched = p.line1; kind = "name"; }
    if (best > 0) hits.push({ place: p, score: best, matched, kind });
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
