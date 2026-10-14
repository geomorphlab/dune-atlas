// Build-time body switch (VITE_BODY=mars; default earth). The Earth build does not load this
// plugin at all, so its output is byte-for-byte the same as before the Mars work.
//
// For Mars it does three things (all declared in src/mars/build.ts):
//  1. module substitution: an import that resolves to an Earth module listed in MARS_SUBSTITUTES
//     resolves to its Mars replacement instead (the replacement itself may import the original);
//  2. source patches: exact find/replace edits of Earth modules (constants such as the planet
//     radius and public texts); every `find` must occur exactly `count` times (default 1), else the
//     build fails - an Earth refactor can never silently drop a Mars change;
//  3. index.html title and description.
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { MARS_HTML, MARS_PATCHES, MARS_SUBSTITUTES, type SourcePatch } from "../src/mars/build";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strip = (id: string) => id.split("?")[0];

/** Apply the edits of one patch to `code`; throws if a `find` does not match exactly `count` times. */
export function applyPatch(code: string, p: SourcePatch): string {
  let out = code;
  for (const e of p.edits) {
    const n = out.split(e.find).length - 1;
    const want = e.count ?? 1;
    if (n !== want) throw new Error(`[mars patch] ${p.file}: expected ${want} match(es) of ${JSON.stringify(e.find.slice(0, 80))}, found ${n}`);
    out = out.split(e.find).join(e.replace);
  }
  return out;
}

export function bodyPlugin(body: "mars"): Plugin {
  void body;
  const subs = new Map(Object.entries(MARS_SUBSTITUTES).map(([a, b]) => [path.join(APP, a), path.join(APP, b)]));
  const patches = new Map(MARS_PATCHES.map((p) => [path.join(APP, p.file), p]));
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
    transform(code, id) {
      const p = patches.get(strip(id));
      return p ? { code: applyPatch(code, p), map: null } : null;
    },
    transformIndexHtml(html) {
      return html.replace(/<title>[^<]*<\/title>/, `<title>${MARS_HTML.title}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${MARS_HTML.description}$2`)
        .replace(/The Dune Atlas needs JavaScript and WebGL\./, `${MARS_HTML.noscript}`);
    },
  };
}
