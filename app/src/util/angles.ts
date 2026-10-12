// Angle conventions.
//  - Source angles (ua bins, at/ae/ao/ab fields): radians, CCW from east, the direction
//    wind/sand moves TOWARD (arctan2(v, u)).
//  - Compass bearing: degrees clockwise from north.
//  - Wind roses are meteorological: direction wind blows FROM = toward + 180 deg.

/** Positive modulo: result in [0, m). */
export function mod(x: number, m: number): number {
  const r = ((x % m) + m) % m;
  return r === m ? 0 : r;
}

/** Math angle (rad, CCW from east, toward) -> compass bearing (deg, toward), [0, 360). Mirrors flux.math_to_bearing_deg. */
export function mathToBearingDeg(a: number): number {
  return mod(90 - (a * 180) / Math.PI, 360);
}

/** Bearing the flow comes FROM given the bearing it goes TOWARD. */
export function towardToFrom(bearingDeg: number): number {
  return mod(bearingDeg + 180, 360);
}

/** Unsigned axis (e.g. alpha_H) as a bearing in [0, 180). */
export function mathToAxisDeg(a: number): number {
  return mod(90 - (a * 180) / Math.PI, 180);
}

/** Compass bearing (deg) -> math angle (rad, CCW from east). Inverse of mathToBearingDeg (mod 2pi). */
export function bearingToMath(bearingDeg: number): number {
  return ((90 - bearingDeg) * Math.PI) / 180;
}

const POINTS16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export function compassPoint(bearingDeg: number): string {
  return POINTS16[Math.round(mod(bearingDeg, 360) / 22.5) % 16];
}

/** Signed smallest difference a-b in degrees, in (-180, 180]. */
export function angleDiffDeg(a: number, b: number): number {
  const d = mod(a - b, 360);
  return d > 180 ? d - 360 : d;
}

/** Screen unit vector for a compass bearing (SVG: +x right, +y down). */
export function bearingToXY(bearingDeg: number, r = 1): [number, number] {
  const t = (bearingDeg * Math.PI) / 180;
  return [r * Math.sin(t), -r * Math.cos(t)];
}
