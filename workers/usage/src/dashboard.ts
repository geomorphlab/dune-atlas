// GET /dashboard?key=…: a private page with charts of the usage figures. It reads /usage.csv with the same
// key and draws everything in the browser (plain SVG, no external scripts), so it needs no upkeep. The world
// map: Natural Earth 1:110m country outlines (public domain) via world-atlas 2.0.2 (ISC), keyed by ISO
// alpha-2 code, equirectangular, 84° N to 58° S (src/worldpaths.json).
import WORLD from "./worldpaths.json";

/** the counter's own icon (three bars; kept distinct from the atlas's lab icon) for the pages of the counter */
export const ICON_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD40lEQVR4nMVXS29bRRT+zpm5dpwax4rjxkCaPlQkRPcR6oof0e5Yg4RUwaos+AVISCBWrJCQWCDxJ1ixYIVAKir0AUQKSaqkTfy+80Jn7jW241SNkxs60sijM+P7fecxM98QAAbggevl5qv2IwLeBfAGgBIAQjEtAEgB/BGAb5/8o78AHgwFOwI0Ll16TVv1PTHfDCFA+nk0Ioo9eP+j1e723ubmFq2trVWGTv2gWG94bw1AugjP6cgXcp8CECyzTpy3P5WVe0cPjb7Dmje8dwKeFAEsYMZOR1EpknhTCJQIFrPaGBq6Qxdbl+8T8/U87HxWcAHWilCvanif2ZmBg66Nc4kmIejzVDzQILoWQjgTcAQH4HzAhQWFrz58CzcuVzEwPtpLmvFou4f3Pr+HZ10jBDk6THRNgCXnZ27ifWoDXm8u4OaNeiSyUkvQqCVx/PabS7jaqmAopMYFogsB/4+E7Gcf0Bs68EQdi7Nisz7MVLfGOTSW7XYC26kJxAjGch8ZTr9v9fzgBOc8nLFj1AAkCU/m9nwIEBGscVisLWCpWYV32T5jxejud9Hb6cxNQp8cHHA2A//gy9tYvdKATbMoKK1wsHOIz97/Ds64jMQJj3M+OVeCMx71lSpaVxuRDCkCMcFZj+b6MpZbS7Cpm6seeI610VvvAox4Lk2czB2VaHjr565Gnm95XvHH5DnaTrEV9LEY8WPTXytKGLyQAMVKT+FMOiYRAnRSAhGfLwHKweur66i31hHlQdxmCdp7W9h+9PvsRV8UAZIDxhpcqK/g1idfY+niGpxNcwIa/cN9fHP3FpwdZKqmINWkx0OC9xaVWgOV2jIGnYNx4n1AuVpDtd6EM4/ziiicgDQRCRbBWZCoiFHjgOBcJFh0OfKsaXYHTNxAhYI/h8D/2/SsSWS5qBaeOs+zosul7cg+UQaTRelHw4llYgsvjkAAsYIuVTINr1TWiaBLZRDrePYn5SSfzzuJLZuTl0alxPFXlHCuhqNNM82QYDnGc7+hVAntvW3sPPxFFCvMoBe79x67j39D5+kW2nsD/H1vK0qvtG9il/nN+7to7x7iSdvh54eHURH3Bi52Gf/6Zwd/7fZR1jwZLTsly4mI5SxIyhUs1hrw3mUsWaHXfgoz6IrCj96+srwYgbN5RudZH2k/Fb0dvV2plaJKlqaYsN826AwcSkdkOTVXr9xlzZ8G7+XYk9hG7+M7ZULyyGEk6ZEgivdyBU8IIijFWTpClm/jZD5bIdGVt4IQyZ03xJx46z9+ztOMZi68+L9R6OLFN71AQEYJjjPH7Fh5dh59mpFMvNTH6ct+nv8Luunp5IC3K+IAAAAASUVORK5CYII=";
export const ICON_ICO_BASE64 = "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";
const WORLD_JSON = JSON.stringify(WORLD);

export const DASHBOARD_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Dune Atlas usage</title>
<link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,${ICON_PNG_BASE64}">
<style>
  body { margin: 0; background: #0d0f13; color: #e8e2d4; font: 14px/1.4 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 0 0 8px; }
  .muted { color: #9a9488; font-size: 12.5px; }
  .ranges button { background: #1b1e25; color: #e8e2d4; border: 1px solid #333844; border-radius: 4px; padding: 4px 10px; margin-right: 4px; cursor: pointer; }
  .ranges button.on { background: #e8b25a; color: #14110d; border-color: #e8b25a; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 14px 0; }
  .tile { background: #161920; border: 1px solid #262a33; border-radius: 6px; padding: 10px 12px; }
  .tile b { display: block; font-size: 24px; color: #f2c879; }
  .card { background: #161920; border: 1px solid #262a33; border-radius: 6px; padding: 12px; margin: 12px 0; }
  .legend span { display: inline-block; margin-right: 12px; font-size: 12.5px; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: right; padding: 4px 8px; border-bottom: 1px solid #262a33; } th:first-child, td:first-child { text-align: left; }
  svg text { fill: #9a9488; font-size: 11px; }
  a { color: #8cc0ff; }
  .geo { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; align-items: start; }
  @media (max-width: 800px) { .geo { grid-template-columns: 1fr; } }
  .metric button { background: #1b1e25; color: #e8e2d4; border: 1px solid #333844; border-radius: 4px; padding: 3px 9px; margin: 0 4px 8px 0; cursor: pointer; font-size: 12.5px; }
  .metric button.on { background: #e8b25a; color: #14110d; border-color: #e8b25a; }
  #map path { stroke: #0d0f13; stroke-width: 0.4; }
</style></head><body><main>
<h1>Dune Atlas usage</h1>
<p class="muted" id="status">Loading…</p>
<div class="ranges" id="ranges"></div>
<div class="tiles" id="tiles"></div>
<div class="card"><h2>Visits per day</h2><div class="legend" id="lg-visits"></div><div id="c-visits"></div>
  <p class="muted">Cloudflare Web Analytics: a visit is a page view arriving from another site or a direct link. Counted from 15 October 2026.</p></div>
<div class="card"><h2>Downloads (cumulative over the range)</h2><div class="legend" id="lg-dl"></div><div id="c-dl"></div>
  <p class="muted">Counted by the atlas when a file is saved or text is copied. Visitors whose browser blocks the message are not counted.</p></div>
<div class="card"><h2>Data served per day (GB)</h2><div id="c-gb"></div>
  <p class="muted">All bytes sent by data.geomorphlab.org (map tiles and data for the page, scripts and bots included); some days are Cloudflare's sampled estimates.</p></div>
<div class="card"><h2>Unique IP addresses per day</h2><div id="c-ip"></div>
  <p class="muted">Whole geomorphlab.org domain as seen by Cloudflare (data host and lab website; the atlas pages themselves are served by GitHub). Not the number of atlas users.</p></div>
<div class="card"><h2>By country</h2><div class="metric" id="metric"></div>
  <div class="geo"><div><div id="map"></div><div id="cbar"></div></div><div id="bars"></div></div>
  <p class="muted">Countries come from Cloudflare (the visitor's network location; VPN users appear in the VPN's country). Grey: none in this range. Colours on a logarithmic scale.</p></div>
<p class="muted"><a id="csv" href="#">Download the CSV</a> · all figures are daily totals by country; no IP addresses or identifiers are kept.</p>
</main>
<script>
(function () {
  var key = new URLSearchParams(location.search).get("key") || "";
  document.getElementById("csv").href = "/usage.csv?key=" + encodeURIComponent(key);
  var COLORS = ["#e8b25a", "#7fb3e6", "#9bd18b", "#e07a6b", "#c39be0", "#6fd0c4", "#d9d36a", "#b0a99a"];
  var TYPE_NAMES = { "map-image": "Map images", "region": "Region boxes", "cell-netcdf": "Cell NetCDF", "cell-csv": "Cell CSV", "citation": "Citations", "plot": "Plots", "copy-code": "Copy code", "copy-citation": "Copy citation" };
  var COUNTRY = (function () { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { return null; } })();
  function cname(c) { if (!c || c === "all") return "All"; if (c === "XX" || c === "T1") return c; try { return (COUNTRY && COUNTRY.of(c)) || c; } catch (e) { return c; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function fmt(n, d) { return Number(n).toLocaleString("en-GB", { maximumFractionDigits: d == null ? 0 : d }); }
  function parse(text) {
    var lines = text.trim().split(/\\r?\\n/), head = lines.shift().split(",");
    return lines.map(function (l) { var v = l.split(","), o = {}; head.forEach(function (h, i) { o[h] = v[i]; }); o.value = Number(o.value); return o; })
      .filter(function (r) { return r.source !== "counter-preview" && r.date; });
  }
  function days(from, to) { var out = [], d = new Date(from + "T00:00:00Z"), e = new Date(to + "T00:00:00Z"); while (d <= e) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); } return out; }
  function chart(el, xs, series, o) {
    o = o || {}; var W = 1040, H = 220, L = 50, R = 10, T = 10, B = 24, w = W - L - R, h = H - T - B;
    var max = 0; series.forEach(function (s) { s.ys.forEach(function (y) { if (y > max) max = y; }); }); if (!(max > 0)) max = 1;
    var X = function (i) { return L + (xs.length < 2 ? w / 2 : (i * w) / (xs.length - 1)); }, Y = function (v) { return T + h - (v / max) * h; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">';
    for (var g = 0; g <= 4; g++) { var v = (max * g) / 4, y = Y(v); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#262a33"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(v, max < 10 ? 1 : 0) + '</text>'; }
    var step = Math.max(1, Math.ceil(xs.length / 8));
    xs.forEach(function (x, i) { if (i % step === 0 || i === xs.length - 1) s += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + x.slice(5) + '</text>'; });
    series.forEach(function (sr) {
      if (o.bars) { var bw = Math.max(1, w / xs.length - 2); sr.ys.forEach(function (v, i) { s += '<rect x="' + (X(i) - bw / 2) + '" y="' + Y(v) + '" width="' + bw + '" height="' + (T + h - Y(v)) + '" fill="' + sr.color + '"><title>' + xs[i] + ': ' + fmt(v, 2) + '</title></rect>'; }); }
      else { s += '<polyline fill="none" stroke="' + sr.color + '" stroke-width="2" points="' + sr.ys.map(function (v, i) { return X(i) + "," + Y(v); }).join(" ") + '"/>'; }
    });
    el.innerHTML = s + "</svg>";
  }
  var WORLD = ${WORLD_JSON};
  var METRICS = [["visits", "Visits", 0], ["downloads", "Downloads", 0], ["gb", "Data served (GB)", 2]], metric = "visits", lastBy = {};
  function ramp(t) { var a = [74, 58, 34], b = [232, 178, 90], c = [255, 242, 200], m = t < 0.6 ? [a, b, t / 0.6] : [b, c, (t - 0.6) / 0.4];
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(m[0][i] + (m[1][i] - m[0][i]) * m[2]); }).join(",") + ")"; }
  function geo(by) {
    lastBy = by;
    var mEl = document.getElementById("metric");
    mEl.innerHTML = METRICS.map(function (m) { return '<button data-m="' + m[0] + '"' + (m[0] === metric ? ' class="on"' : "") + ">" + m[1] + "</button>"; }).join("");
    var spec = METRICS.filter(function (m) { return m[0] === metric; })[0];
    var vals = Object.keys(by).map(function (k) { return [k, by[k][metric]]; }).filter(function (e) { return e[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
    var max = vals.length ? vals[0][1] : 1, lmax = Math.log10(max + 1) || 1;
    var col = function (v) { return v > 0 ? ramp(Math.log10(v + 1) / lmax) : "#2a2e38"; };
    var s = '<svg viewBox="0 0 1000 394.4" width="100%" role="img" aria-label="World map">';
    Object.keys(WORLD).forEach(function (k) { var v = by[k] ? by[k][metric] : 0;
      s += '<path d="' + WORLD[k] + '" fill="' + col(v) + '"><title>' + esc(cname(k)) + ": " + fmt(v, spec[2]) + "</title></path>"; });
    document.getElementById("map").innerHTML = s + "</svg>";
    var stops = []; for (var i = 0; i <= 10; i++) stops.push('<stop offset="' + i * 10 + '%" stop-color="' + ramp(i / 10) + '"/>');
    var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (t) { var v = Math.pow(10, t * lmax) - 1; return '<text x="' + (10 + t * 380) + '" y="34" text-anchor="middle">' + fmt(v, max < 10 ? spec[2] || 1 : 0) + "</text>"; }).join("");
    document.getElementById("cbar").innerHTML = '<svg viewBox="0 0 400 40" width="60%" style="min-width:260px"><defs><linearGradient id="g">' + stops.join("") + '</linearGradient></defs><rect x="10" y="6" width="380" height="12" fill="url(#g)" rx="2"/>' + ticks + "</svg>";
    var top = vals.slice(0, 15), bw = 260, rowH = 20, H2 = top.length * rowH + 4, b = '<svg viewBox="0 0 420 ' + Math.max(H2, 24) + '" width="100%" role="img" aria-label="Countries ranked">';
    if (!top.length) b += '<text x="0" y="16">None in this range</text>';
    top.forEach(function (e, i) { var y = i * rowH + 2, w = (e[1] / max) * bw;
      b += '<text x="120" y="' + (y + 13) + '" text-anchor="end" style="fill:#e8e2d4">' + esc(cname(e[0]).slice(0, 20)) + '</text><rect x="126" y="' + (y + 3) + '" width="' + Math.max(w, 1) + '" height="13" fill="' + col(e[1]) + '" rx="2"/><text x="' + (130 + w) + '" y="' + (y + 13) + '">' + fmt(e[1], spec[2]) + "</text>"; });
    document.getElementById("bars").innerHTML = b + "</svg>";
  }
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("#metric button"); if (t) { metric = t.getAttribute("data-m"); geo(lastBy); } });
  function legend(el, series) { el.innerHTML = series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + "</span>"; }).join(""); }
  function render(rows, range) {
    var all = rows.map(function (r) { return r.date; }).sort(), first = all[0], last = all[all.length - 1];
    var start = first;
    if (range !== "all") { var d = new Date(last + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - Number(range) + 1); var s0 = d.toISOString().slice(0, 10); if (s0 > first) start = s0; }
    var xs = days(start, last), R = rows.filter(function (r) { return r.date >= start; });
    var sum = function (f) { return R.filter(f).reduce(function (a, r) { return a + r.value; }, 0); };
    var perDay = function (f) { var m = {}; R.filter(f).forEach(function (r) { m[r.date] = (m[r.date] || 0) + r.value; }); return xs.map(function (x) { return m[x] || 0; }); };
    var isCount = function (r) { return r.measure.indexOf("export_count:") === 0; };
    var ipDays = R.filter(function (r) { return r.measure === "unique_ips_zone"; });
    document.getElementById("tiles").innerHTML = [
      ["Visits", fmt(sum(function (r) { return r.measure === "visits"; }))],
      ["Page views", fmt(sum(function (r) { return r.measure === "page_views"; }))],
      ["Downloads", fmt(sum(isCount))],
      ["Downloaded files (GB)", fmt(sum(function (r) { return r.measure.indexOf("export_bytes:") === 0; }) / 1e9, 2)],
      ["Data served (GB)", fmt(sum(function (r) { return r.measure === "data_host_bytes"; }) / 1e9, 1)],
      ["Unique IPs per day (domain, mean)", ipDays.length ? fmt(ipDays.reduce(function (a, r) { return a + r.value; }, 0) / ipDays.length) : "–"],
    ].map(function (t) { return '<div class="tile"><span class="muted">' + t[0] + "</span><b>" + t[1] + "</b></div>"; }).join("");
    var vis = [["earth", "Earth", COLORS[0]], ["mars", "Mars", COLORS[3]]].map(function (b) { return { name: b[1], color: b[2], ys: perDay(function (r) { return r.measure === "visits" && r.body === b[0]; }) }; });
    var visAll = perDay(function (r) { return r.measure === "visits"; });
    if (vis[0].ys.concat(vis[1].ys).every(function (v) { return v === 0; }) && visAll.some(function (v) { return v > 0; })) vis = [{ name: "All", color: COLORS[0], ys: visAll }];
    legend(document.getElementById("lg-visits"), vis); chart(document.getElementById("c-visits"), xs, vis);
    var types = Object.keys(TYPE_NAMES).filter(function (t) { return R.some(function (r) { return r.measure === "export_count:" + t; }); });
    var dl = types.map(function (t, i) { var c = 0; return { name: TYPE_NAMES[t], color: COLORS[i % COLORS.length], ys: perDay(function (r) { return r.measure === "export_count:" + t; }).map(function (v) { return (c += v); }) }; });
    legend(document.getElementById("lg-dl"), dl.length ? dl : [{ name: "No downloads in this range", color: "#333844" }]);
    chart(document.getElementById("c-dl"), xs, dl);
    chart(document.getElementById("c-gb"), xs, [{ name: "GB", color: COLORS[1], ys: perDay(function (r) { return r.measure === "data_host_bytes"; }).map(function (v) { return v / 1e9; }) }], { bars: true });
    chart(document.getElementById("c-ip"), xs, [{ name: "IPs", color: COLORS[2], ys: perDay(function (r) { return r.measure === "unique_ips_zone"; }) }]);
    var by = {};
    R.forEach(function (r) { if (r.country === "all") return; var c = by[r.country] || (by[r.country] = { visits: 0, downloads: 0, gb: 0 });
      if (r.measure === "visits") c.visits += r.value; else if (isCount(r)) c.downloads += r.value; else if (r.measure === "data_host_bytes") c.gb += r.value / 1e9; });
    geo(by);
    document.getElementById("status").textContent = "Daily figures from " + start + " to " + last + " (UTC). Updated every day at 03:17 UTC; downloads are added as they happen.";
  }
  fetch("/usage.csv?key=" + encodeURIComponent(key)).then(function (r) { if (!r.ok) throw new Error(r.status === 403 ? "The key is missing or wrong." : "Could not load the figures (" + r.status + ")."); return r.text(); })
    .then(function (text) {
      var rows = parse(text);
      if (!rows.length) { document.getElementById("status").textContent = "No figures yet."; return; }
      var ranges = [["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All"]], cur = "90";
      var el = document.getElementById("ranges");
      var draw = function () { el.innerHTML = ranges.map(function (r) { return '<button data-r="' + r[0] + '"' + (r[0] === cur ? ' class="on"' : "") + ">" + r[1] + "</button>"; }).join(""); render(rows, cur); };
      el.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { cur = b.getAttribute("data-r"); draw(); } });
      draw();
    }).catch(function (e) { document.getElementById("status").textContent = e.message; });
})();
</script></body></html>`;
