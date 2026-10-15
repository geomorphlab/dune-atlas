// @vitest-environment happy-dom
// The counter's private dashboard page (workers/usage/src/dashboard.ts), drawn from a small CSV
import { it, expect, vi } from "vitest";
import { DASHBOARD_HTML } from "../../workers/usage/src/dashboard";
it("the usage dashboard renders tiles, the world map and the ranked bars from the CSV", async () => {
  const csv = ["date,country,body,measure,value,unit,source,sample_interval",
    "2026-10-14,AU,all,data_host_bytes,12121530463,bytes,data_host,2.3", "2026-10-14,US,all,data_host_bytes,76937621,bytes,data_host,2.2",
    "2026-10-14,all,all,unique_ips_zone,136,count,zone_daily,", "2026-10-15,AU,mars,export_count:map-image,1,count,counter,",
    "2026-10-15,AU,mars,export_bytes:map-image,3338299,bytes,counter,", "2026-10-15,FR,earth,visits,4,count,web_analytics,1"].join("\n");
  vi.stubGlobal("fetch", async () => ({ ok: true, text: async () => csv }));
  const html = DASHBOARD_HTML;
  const body = html.slice(html.indexOf("<main>"), html.indexOf("<script>"));
  document.body.innerHTML = body;
  const js = html.slice(html.indexOf("<script>") + 8, html.indexOf("</script>"));
  new Function(js)();
  await new Promise((r) => setTimeout(r, 50));
  expect(document.getElementById("status")!.textContent).toMatch(/Daily figures from/);
  expect(document.querySelectorAll("#map path").length).toBeGreaterThan(150);
  expect(document.getElementById("bars")!.textContent).toContain("France");
  (document.querySelector('#metric button[data-m="gb"]') as HTMLButtonElement).click();
  expect(document.getElementById("bars")!.textContent).toContain("Australia");
});
