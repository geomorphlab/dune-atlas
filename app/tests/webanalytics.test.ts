// Cloudflare Web Analytics: the dashboard snippet, production builds only, page-view counting of address changes off
import { describe, expect, it } from "vitest";
import { CF_WEB_ANALYTICS_TOKEN, webAnalytics, webAnalyticsSnippet } from "../scripts/body-html";
import { PRIVACY_NOTE } from "../src/core/ui/layerPanel";

describe("Cloudflare Web Analytics snippet", () => {
  it("is the dashboard snippet with spa off, added before </body> in builds only", () => {
    const s = webAnalyticsSnippet();
    expect(s).toContain("https://static.cloudflareinsights.com/beacon.min.js");
    expect(s).toContain(`"token": "${CF_WEB_ANALYTICS_TOKEN}"`);
    expect(s).toContain(`"spa": false`);
    const p = webAnalytics();
    expect(p.apply).toBe("build");
    const out = (p.transformIndexHtml as (h: string) => string)("<html><body><div></div></body></html>");
    expect(out.indexOf("cloudflareinsights")).toBeLessThan(out.indexOf("</body>"));
  });
  it("About states how use is counted", () => {
    expect(PRIVACY_NOTE).toBe("To understand how the atlas is used, we count page visits and downloads by country, with Cloudflare Web Analytics and a small counter of our own. No cookies are set and no IP addresses are kept.");
  });
});
