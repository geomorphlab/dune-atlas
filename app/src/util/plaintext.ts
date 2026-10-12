// TeX-ish strings ($...$ math segments, as in the source attrs) -> readable PLAIN text for data
// files (NetCDF long_name / description, CSV header row 3, README): no backslashes, no dollar
// signs, no braces. Symbols become Unicode (α, Σ, ⟨⟩, ∥, ⊥), friction-velocity subscripts
// u_{\ast,X} become u*,X, other group sub/superscripts _( ) / ^( ), digit superscripts ² ³.

const SYM: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", theta: "θ", sigma: "σ", mu: "μ", pi: "π", kappa: "κ", rho: "ρ", tau: "τ", phi: "φ",
  sum: "Σ", langle: "⟨", rangle: "⟩", parallel: "∥", bot: "⊥", perp: "⊥", ast: "*", cdot: "·", times: "×",
  lvert: "|", rvert: "|", vert: "|", mid: "|", le: "≤", leq: "≤", ge: "≥", geq: "≥", approx: "≈", infty: "∞",
  arg: "arg", exp: "exp", log: "log", ln: "ln", sin: "sin", cos: "cos",
  left: "", right: "", ",": " ", ";": " ", quad: " ", " ": " ",
};
const SPACE_AFTER = new Set(["sum", "arg", "exp", "log", "ln", "sin", "cos", "quad"]);
const SUP_DIGIT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };

function group(s: string, i: number): [string, number] {
  if (s[i] === "{") {
    let d = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === "{") d++;
      else if (s[j] === "}" && --d === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  }
  if (s[i] === "\\") { const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i)); if (m) return [m[0], i + m[0].length]; }
  return [s[i] ?? "", i + 1];
}

function math(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i))!;
      const name = m[1];
      i += m[0].length;
      if (name === "hat" || name === "bar" || name === "tilde" || name === "vec") {
        const [g, j] = group(s, i); i = j;
        out += math(g) + ({ hat: "\u0302", bar: "\u0304", tilde: "\u0303", vec: "\u20d7" } as Record<string, string>)[name];
      } else if (name === "frac") {
        const [a, j] = group(s, i); const [b, k] = group(s, j); i = k;
        out += `(${math(a)})/(${math(b)})`;
      } else if (name === "mathrm" || name === "text" || name === "mathit" || name === "operatorname") {
        const [g, j] = group(s, i); i = j; out += g;
      } else {
        const sym = SYM[name] ?? name;
        out += sym;
        // TeX swallows the space after a control word; keep one only after operators that read
        // as words (\sum n -> "Σ n", \arg x -> "arg x")
        if (/^[a-zA-Z]+$/.test(name)) {
          const hadSpace = s[i] === " ";
          while (s[i] === " ") i++;
          if (hadSpace && SPACE_AFTER.has(name)) out += " ";
        }
      }
    } else if (c === "_" || c === "^") {
      const [g, j] = group(s, i + 1); i = j;
      const inner = math(g);
      if (c === "_" && /^\*,/.test(inner)) out += inner;               // u_{\ast,f} -> u*,f
      else if (c === "^" && /^[0-9-]+$/.test(inner)) out += [...inner].map((d) => SUP_DIGIT[d]).join("");
      else out += c + ([...inner].length > 1 ? `(${inner})` : inner);
    } else if (c === "{" || c === "}") {
      i++;
    } else {
      out += c; i++;
    }
  }
  return out;
}

/** Plain text of a TeX-ish string (text outside $...$ kept, math converted). */
export function texToPlain(s: string | undefined | null): string {
  if (!s) return "";
  const parts = s.split("$");
  return parts.map((seg, k) => (k % 2 === 1 ? math(seg) : seg.replace(/\\([a-zA-Z]+)/g, (_, n) => SYM[n] ?? n))).join("").replace(/[ \t]+/g, " ").trim();
}
