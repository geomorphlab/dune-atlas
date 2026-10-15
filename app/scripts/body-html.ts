// index.html of a body build: title, meta description and noscript text from src/bodies/<body>/html.ts
// (the Earth texts equal the ones in index.html).
import type { Plugin } from "vite";

export interface BodyHtml {
  title: string; description: string; noscript: string;
  /** link previews (Open Graph, read by Slack, Bluesky, Mastodon, LinkedIn, …; Twitter card for X) */
  ogTitle: string; url: string; image: string; imageAlt: string;
}

/** the link-preview tags (absolute URLs: previewers do not resolve relative ones) */
export function previewTags(t: BodyHtml): string {
  const a = (s: string) => s.replace(/&(?!amp;)/g, "&amp;").replace(/"/g, "&quot;");
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Monash Geomorphology Lab" />`,
    `<meta property="og:title" content="${a(t.ogTitle)}" />`,
    `<meta property="og:description" content="${a(t.description)}" />`,
    `<meta property="og:url" content="${a(t.url)}" />`,
    `<meta property="og:image" content="${a(t.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${a(t.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");
}

export function bodyHtml(t: BodyHtml): Plugin {
  return {
    name: "dune-atlas-body-html",
    transformIndexHtml(html) {
      return html.replace(/<title>[^<]*<\/title>/, `<title>${t.title}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${t.description}$2`)
        .replace(/(<noscript>)[^<]*(<\/noscript>)/, `$1${t.noscript}$2`)
        .replace(/<!-- link preview -->[\s\S]*?<!-- \/link preview -->/, `<!-- link preview -->\n    ${previewTags(t)}\n    <!-- /link preview -->`);
    },
  };
}

/** Cloudflare Web Analytics (site map.geomorphlab.org, both atlases; cookieless page-view counts by country and
 *  path): the snippet from the Cloudflare dashboard, before </body>, in production builds only (never in the dev
 *  server). "spa": false: the app rewrites its address on every view change, which must not count as page views. */
export const CF_WEB_ANALYTICS_TOKEN = "10568f175cad47dca2ee05eaf9fcddb8";
export function webAnalyticsSnippet(token = CF_WEB_ANALYTICS_TOKEN): string {
  return `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "${token}", "spa": false}'></script><!-- End Cloudflare Web Analytics -->`;
}
export function webAnalytics(token = CF_WEB_ANALYTICS_TOKEN): Plugin {
  return {
    name: "dune-atlas-web-analytics",
    apply: "build",
    transformIndexHtml(html) { return html.replace("</body>", `${webAnalyticsSnippet(token)}\n</body>`); },
  };
}
