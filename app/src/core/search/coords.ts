// Typed coordinates for the search box: decimal degrees or degrees, minutes and seconds, signed or with
// N/S/E/W (or the words north, south, east, west); latitude first unless the letters say otherwise.
//   "-24.5, 15.2"   "24.5 S 15.2 E"   "S24.5 E15.2"   "24°30′S, 15°12′E"   "24 30 00 S 15 12 00 E"
//   "24,5; 15,2" (decimal commas when the two values are separated by a semicolon)
// Longitudes are read from -180 to 360 and returned in the body's convention: -180..180 east-positive on
// both atlases (a longitude above 180° E is converted and the conversion reported); 0..360 is kept for a
// body that would use it.

export type LonRange = 180 | 360;

export type CoordParse =
  | { ok: true; lat: number; lon: number; note?: string }
  | { ok: false; error: string };

type Unit = 0 | 1 | 2; // degrees, minutes, seconds
type Tok = { k: "num"; v: number; neg: boolean; unit?: Unit } | { k: "hemi"; h: string } | { k: "sep" };

const HEMI_WORDS: Record<string, string> = { n: "N", north: "N", s: "S", south: "S", e: "E", east: "E", w: "W", west: "W" };
const UNIT_MARKS: Record<string, Unit> = { "°": 0, "º": 0, "˚": 0, "'": 1, "′": 1, "’": 1, "‘": 1, "\"": 2, "″": 2, "”": 2, "“": 2, "''": 2, "′′": 2 };

function normalise(s: string): string {
  let t = s.replace(/[º˚]/g, "°").normalize("NFKC").replace(/[\u2212\u2012\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();
  if (t.includes(";")) t = t.replace(/(\d),(\d)/g, "$1.$2");   // decimal commas: "24,5; 15,2"
  return t;
}

/** Numbers (with sign and an optional unit mark), hemisphere letters / words and separators (, ; /). */
function tokenise(s: string): Tok[] | string {
  const out: Tok[] = [];
  const re = /\s*(?:([+-]?)(\d+(?:\.\d*)?|\.\d+)|(''|′′|[°º˚'′’‘"″”“])|([A-Za-z]+)|([,;/])|(\S))/y;
  let m: RegExpExecArray | null;
  while (re.lastIndex < s.length && (m = re.exec(s)) && m[0] !== "") {
    if (m[2] !== undefined) out.push({ k: "num", v: Number(m[2]), neg: m[1] === "-" });
    else if (m[3] !== undefined || (m[4] && /^(d|deg|degrees?)$/i.test(m[4]))) {
      const last = out[out.length - 1];
      if (!last || last.k !== "num" || last.unit !== undefined) return "a degree, minute or second mark without a number";
      last.unit = m[3] !== undefined ? UNIT_MARKS[m[3]] : 0;
    } else if (m[4] !== undefined) {
      const h = HEMI_WORDS[m[4].toLowerCase()];
      if (!h) return `"${m[4]}" is not part of a coordinate`;
      out.push({ k: "hemi", h });
    } else if (m[5] !== undefined) out.push({ k: "sep" });
    else return `"${m[6]}" is not part of a coordinate`;
  }
  return out;
}

/** Split the tokens into the two coordinates: at separators; else at hemisphere letters; else before
 *  a number with a degree mark; else (two plain numbers) between them. */
function split(ts: Tok[]): Tok[][] | string {
  const segs = (cut: (i: number) => boolean) => {
    const out: Tok[][] = [[]];
    ts.forEach((t, i) => { if (cut(i) && out[out.length - 1].length) out.push([]); if (t.k !== "sep") out[out.length - 1].push(t); });
    return out.filter((s) => s.length);
  };
  if (ts.some((t) => t.k === "sep")) {
    const out: Tok[][] = [[]];
    for (const t of ts) { if (t.k === "sep") out.push([]); else out[out.length - 1].push(t); }
    if (out.some((s) => !s.length)) return "a value is missing before or after the separator";
    return out;
  }
  const hemi = ts.map((t, i) => (t.k === "hemi" ? i : -1)).filter((i) => i >= 0);
  if (hemi.length) {
    const prefix = hemi[0] === 0;
    // prefix letters ("S24.5 E15.2"): cut before each letter; suffix letters ("24.5S 15.2E"): cut after each
    const out = segs((i) => (prefix ? ts[i].k === "hemi" : i > 0 && ts[i - 1].k === "hemi"));
    return out;
  }
  if (ts.some((t) => t.k === "num" && t.unit !== undefined)) {
    return segs((i) => { const t = ts[i]; return i > 0 && t.k === "num" && (t.unit === 0 || (t.unit === undefined && (ts[i - 1] as { unit?: Unit }).unit === 2)); });
  }
  if (ts.length === 2) return [[ts[0]], [ts[1]]];
  return ts.length < 2 ? "two values are needed: latitude and longitude" : "separate latitude and longitude with a comma";
}

/** One coordinate in signed decimal degrees, with the axis its letter gives. */
function value(seg: Tok[]): { v: number; axis?: "lat" | "lon" } | string {
  const hs = seg.filter((t): t is Extract<Tok, { k: "hemi" }> => t.k === "hemi");
  const ps = seg.filter((t): t is Extract<Tok, { k: "num" }> => t.k === "num");
  if (hs.length > 1) return "two hemisphere letters in one value";
  if (!ps.length) return "a hemisphere letter without a value";
  if (ps.length > 3) return "more than degrees, minutes and seconds in one value";
  for (let i = 0; i < ps.length; i++) {
    const u = ps[i].unit ?? i;
    if (u !== i) return "minutes and seconds must follow the degrees";
    if (i > 0 && ps[i].neg) return "a minus sign belongs before the degrees";
    if (i > 0 && ps[i].v >= 60) return `${i === 1 ? "minutes" : "seconds"} must be below 60`;
    if (i < ps.length - 1 && !Number.isInteger(ps[i].v)) return "only the last of degrees, minutes and seconds can have decimals";
  }
  let v = ps[0].v + (ps[1]?.v ?? 0) / 60 + (ps[2]?.v ?? 0) / 3600;
  const h = hs[0]?.h;
  if (h) {
    if (ps[0].neg) return "use either a minus sign or a hemisphere letter, not both";
    if (h === "S" || h === "W") v = -v;
    return { v, axis: h === "N" || h === "S" ? "lat" : "lon" };
  }
  return { v: ps[0].neg ? -v : v };
}

/** wrap to -180..180 or 0..360 */
export function wrapLonTo(lon: number, range: LonRange): number {
  if (range === 360 ? lon >= 0 && lon < 360 : lon >= -180 && lon <= 180) return lon === 0 ? 0 : lon;   // exact when in range
  if (range === 360) { const w = ((lon % 360) + 360) % 360; return w === 0 ? 0 : w; }
  const w = ((((lon + 180) % 360) + 360) % 360) - 180;
  return w === -180 && lon > 0 ? 180 : w === 0 ? 0 : w;
}

const fmt = (v: number) => String(Math.round(v * 1e4) / 1e4);

/** Parse typed coordinates; `range` is the body's longitude convention. */
export function parseCoordinates(input: string, range: LonRange = 180): CoordParse {
  const s = normalise(input);
  if (!s) return { ok: false, error: "type a latitude and a longitude" };
  if (!/\d/.test(s)) return { ok: false, error: "no numbers found" };
  const ts = tokenise(s);
  if (typeof ts === "string") return { ok: false, error: ts };
  const segs = split(ts);
  if (typeof segs === "string") return { ok: false, error: segs };
  if (segs.length !== 2) return { ok: false, error: segs.length < 2 ? "two values are needed: latitude and longitude" : `${segs.length} values found; two are needed: latitude and longitude` };
  const a = value(segs[0]), b = value(segs[1]);
  if (typeof a === "string") return { ok: false, error: a };
  if (typeof b === "string") return { ok: false, error: b };
  if (a.axis && b.axis && a.axis === b.axis) return { ok: false, error: a.axis === "lat" ? "both values have N/S letters" : "both values have E/W letters" };
  const [lat, lon] = a.axis === "lon" || b.axis === "lat" ? [b.v, a.v] : [a.v, b.v];
  if (!(Math.abs(lat) <= 90)) {
    const swap = !a.axis && !b.axis && Math.abs(lon) <= 90;
    return { ok: false, error: `latitude must be between -90 and 90${swap ? " (latitude comes first)" : ""}` };
  }
  if (!(lon >= -180 && lon <= 360)) return { ok: false, error: "longitude must be between -180 and 360" };
  const w = wrapLonTo(lon, range);
  let note: string | undefined;
  if (range === 360 && lon < 0) note = `${fmt(-lon)}° W = ${fmt(w)}° E (east-positive)`;
  else if (range === 180 && lon > 180) note = `${fmt(lon)}° E = ${fmt(-w)}° W`;
  return { ok: true, lat, lon: w, ...(note ? { note } : {}) };
}

/** "24.5000° S, 15.2000° E" (range 180, both atlases) or "24.5000° S, 350.0000° E" (range 360) */
export function formatCoord(lat: number, lon: number, range: LonRange = 180, digits = 4): string {
  const la = `${Math.abs(lat).toFixed(digits)}° ${lat < 0 ? "S" : "N"}`;
  if (range === 360) return `${la}, ${wrapLonTo(lon, 360).toFixed(digits)}° E`;
  const w = wrapLonTo(lon, 180);
  return `${la}, ${Math.abs(w).toFixed(digits)}° ${w < 0 ? "W" : "E"}`;
}
