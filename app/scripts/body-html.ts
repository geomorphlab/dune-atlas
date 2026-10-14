// index.html of a body build: title, meta description and noscript text from src/bodies/<body>/html.ts
// (the Earth texts equal the ones in index.html).
import type { Plugin } from "vite";

export interface BodyHtml { title: string; description: string; noscript: string }

export function bodyHtml(t: BodyHtml): Plugin {
  return {
    name: "dune-atlas-body-html",
    transformIndexHtml(html) {
      return html.replace(/<title>[^<]*<\/title>/, `<title>${t.title}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${t.description}$2`)
        .replace(/(<noscript>)[^<]*(<\/noscript>)/, `$1${t.noscript}$2`);
    },
  };
}
