// MathJax TeX -> SVG (paths, no font cache), used only for image exports; imported lazily by
// texsvg.ts (a separate chunk). Supports the TeX of the atlas labels (Greek, sub/superscripts,
// \vec, \hat, \nabla, \cdot, \ast, \langle, \bot, \parallel, \mathrm, fractions a/b, ...).
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import "mathjax-full/js/input/tex/base/BaseConfiguration.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
import type { MathBox, MathRenderer } from "./texsvg";

export function createMathRenderer(): MathRenderer {
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const doc = mathjax.document("", { InputJax: new TeX({ packages: ["base", "ams"] }), OutputJax: new SVG({ fontCache: "none" }) });
  return {
    render(tex: string): MathBox {
      const node = doc.convert(tex, { display: false, em: 16, ex: 8, containerWidth: 1000 });
      const html = adaptor.outerHTML(node);
      if (/data-mjx-error|merror/.test(html)) throw new Error(`TeX error in ${tex}: ${adaptor.textContent(node)}`);
      const vb = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(html);
      if (!vb) throw new Error(`no SVG for ${tex}`);
      const [minX, minY, w, h] = vb.slice(1).map(Number);
      const inner = html.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "")
        .replace(/\sdata-[a-z-]+="[^"]*"/g, "").replace(/<title>[\s\S]*?<\/title>/g, "");
      const body = minX ? `<g transform="translate(${-minX} 0)">${inner}</g>` : inner;
      return { body, w: w / 1000, a: -minY / 1000, d: (h + minY) / 1000 };
    },
  };
}
