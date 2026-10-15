// GET /dashboard?key=…: a private page with charts of the usage figures. It reads /usage.csv with the same
// key and draws everything in the browser (plain SVG, no external scripts), so it needs no upkeep.
export const DASHBOARD_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Dune Atlas usage</title>
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
<div class="card"><h2>Countries</h2><div id="t-countries"></div></div>
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
    R.forEach(function (r) { if (r.country === "all") return; var c = by[r.country] || (by[r.country] = { v: 0, d: 0, gb: 0 });
      if (r.measure === "visits") c.v += r.value; else if (isCount(r)) c.d += r.value; else if (r.measure === "data_host_bytes") c.gb += r.value / 1e9; });
    var list = Object.keys(by).map(function (k) { return [k, by[k]]; }).sort(function (a, b) { return b[1].v - a[1].v || b[1].d - a[1].d || b[1].gb - a[1].gb; }).slice(0, 40);
    document.getElementById("t-countries").innerHTML = "<table><tr><th>Country</th><th>Visits</th><th>Downloads</th><th>Data served (GB)</th></tr>" +
      list.map(function (e) { return "<tr><td>" + esc(cname(e[0])) + "</td><td>" + fmt(e[1].v) + "</td><td>" + fmt(e[1].d) + "</td><td>" + fmt(e[1].gb, 2) + "</td></tr>"; }).join("") + "</table>";
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
