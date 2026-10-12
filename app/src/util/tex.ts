// Minimal LaTeX-to-HTML for field long names/units from the source attrs
// (e.g. "$\\langle |Q_{\\bot}(\\alpha_E)|\\rangle$", "m$^2$/s"). Not a TeX engine:
// handles the symbols that appear in qsat_params attrs only.

const SYMBOLS: Record<string, string> = {
  langle: "⟨", rangle: "⟩", alpha: "α", beta: "β", sigma: "σ", parallel: "∥", bot: "⊥",
  perp: "⊥", ast: "*", cdot: "·", times: "×", lvert: "|", rvert: "|", pi: "π", theta: "θ",
  mu: "μ", Delta: "Δ", left: "", right: "", ",": " ", ";": " ", quad: " ",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Read a TeX group starting at s[i] ('{...}' or a single char); returns [content, nextIndex]. */
function readGroup(s: string, i: number): [string, number] {
  if (s[i] === "{") {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  }
  if (s[i] === "\\") {
    const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
    if (m) return [m[0], i + m[0].length];
  }
  return [s[i] ?? "", i + 1];
}

function convertMath(s: string, math = true): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i))!;
      const name = m[1];
      i += m[0].length;
      if (name === "hat") {
        const [g, j] = readGroup(s, i);
        out += convertMath(g, math) + "\u0302";
        i = j;
      } else if (name in SYMBOLS) out += SYMBOLS[name];
      else if (name === "{" || name === "}" || name === "|") out += name;
      else out += escapeHtml(name);
    } else if (ch === "_" || ch === "^") {
      const [g, j] = readGroup(s, i + 1);
      const tag = ch === "_" ? "sub" : "sup";
      out += `<${tag}>${convertMath(g, math)}</${tag}>`;
      i = j;
    } else if (ch === "{" || ch === "}" || (math && /\s/.test(ch))) i++; // TeX math ignores spaces
    else {
      out += escapeHtml(ch);
      i++;
    }
  }
  return out;
}

/** TeX-ish string ($...$ math segments) -> HTML (sub/sup tags, Unicode symbols). */
export function texToHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .split("$")
    .map((seg, k) => convertMath(seg, k % 2 === 1))
    .join("");
}

/** TeX-ish string -> plain text (for aria labels, CSV headers). */
export function texToText(s: string | undefined | null): string {
  return texToHtml(s)
    .replace(/<sub>(.*?)<\/sub>/g, "_$1")
    .replace(/<sup>(.*?)<\/sup>/g, "^$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
