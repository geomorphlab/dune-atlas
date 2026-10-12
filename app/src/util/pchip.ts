// Shape-preserving piecewise cubic Hermite interpolation (PCHIP, Fritsch–Carlson / Fritsch–Butland
// slopes as in scipy.interpolate.PchipInterpolator): passes through every data point, is monotone
// between monotone neighbours and has no overshoot. Used to draw smooth lines in the panel plots.

/** Node slopes for strictly increasing x. */
export function pchipSlopes(x: ArrayLike<number>, y: ArrayLike<number>): number[] {
  const n = x.length;
  if (n < 2) return new Array(n).fill(0);
  const h: number[] = [], del: number[] = [];
  for (let k = 0; k < n - 1; k++) { h.push(x[k + 1] - x[k]); del.push((y[k + 1] - y[k]) / (x[k + 1] - x[k])); }
  if (n === 2) return [del[0], del[0]];
  const d = new Array(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    if (del[k - 1] === 0 || del[k] === 0 || Math.sign(del[k - 1]) !== Math.sign(del[k])) { d[k] = 0; continue; }
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    d[k] = (w1 + w2) / (w1 / del[k - 1] + w2 / del[k]);
  }
  // one-sided three-point end slopes, shape-preserving (scipy _edge_case)
  const edge = (h0: number, h1: number, m0: number, m1: number) => {
    let e = ((2 * h0 + h1) * m0 - h0 * m1) / (h0 + h1);
    if (Math.sign(e) !== Math.sign(m0)) e = 0;
    else if (Math.sign(m0) !== Math.sign(m1) && Math.abs(e) > Math.abs(3 * m0)) e = 3 * m0;
    return e;
  };
  d[0] = edge(h[0], h[1], del[0], del[1]);
  d[n - 1] = edge(h[n - 2], h[n - 3], del[n - 2], del[n - 3]);
  return d;
}

/** Dense evaluation: `per` samples per interval, data points included exactly. */
export function pchipDense(x: ArrayLike<number>, y: ArrayLike<number>, per = 8): { x: number[]; y: number[] } {
  const n = x.length;
  if (n < 2) return { x: Array.from(x), y: Array.from(y) };
  const d = pchipSlopes(x, y);
  const ox: number[] = [], oy: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const hk = x[k + 1] - x[k];
    for (let j = 0; j < per; j++) {
      const t = j / per;
      const h00 = (1 + 2 * t) * (1 - t) ** 2, h10 = t * (1 - t) ** 2, h01 = t * t * (3 - 2 * t), h11 = t * t * (t - 1);
      ox.push(x[k] + t * hk);
      oy.push(j === 0 ? y[k] : h00 * y[k] + h10 * hk * d[k] + h01 * y[k + 1] + h11 * hk * d[k + 1]);
    }
  }
  ox.push(x[n - 1]); oy.push(y[n - 1]);
  return { x: ox, y: oy };
}

/** Unwrap an angle series (deg) so consecutive values differ by less than period / 2. */
export function unwrapDeg(v: number[], period = 360): number[] {
  const out = v.slice();
  for (let i = 1; i < out.length; i++) {
    let d = out[i] - out[i - 1];
    d -= period * Math.round(d / period);
    out[i] = out[i - 1] + d;
  }
  return out;
}
