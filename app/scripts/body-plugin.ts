// Build-time body switch (VITE_BODY=mars; default earth). The Earth build does not load this
// plugin at all, so its output is byte-for-byte the same as before the Mars work.
//
// For Mars it does two things (both declared in src/bodies/mars/build.ts):
//  1. module substitution: an import that resolves to an Earth module listed in MARS_SUBSTITUTES
//     resolves to its Mars replacement instead (the replacement itself may import the original);
//  2. index.html title and description.
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { MARS_HTML, MARS_SUBSTITUTES } from "../src/bodies/mars/build";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strip = (id: string) => id.split("?")[0];

export function bodyPlugin(body: "mars"): Plugin {
  void body;
  const subs = new Map(Object.entries(MARS_SUBSTITUTES).map(([a, b]) => [path.join(APP, a), path.join(APP, b)]));
  return {
    name: "dune-atlas-body",
    enforce: "pre",
    async resolveId(source, importer, opts) {
      const r = await this.resolve(source, importer, { ...opts, skipSelf: true });
      if (!r || r.external) return r;
      const id = strip(r.id);
      const sub = subs.get(id);
      if (!sub) return r;
      if (importer && path.resolve(strip(importer)) === sub) return r; // the replacement imports the original
      return { ...r, id: sub + r.id.slice(id.length) };
    },
    transformIndexHtml(html) {
      return html.replace(/<title>[^<]*<\/title>/, `<title>${MARS_HTML.title}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${MARS_HTML.description}$2`)
        .replace(/The Dune Atlas needs JavaScript and WebGL\./, `${MARS_HTML.noscript}`);
    },
  };
}
