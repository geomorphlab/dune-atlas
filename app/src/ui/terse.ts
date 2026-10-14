// Terse row labels of the cell summary table (PI round 5 item 4, both builds): the quantity only, no
// parentheses (unless a unit) and no trailing symbol (the Symbol column shows it); the details live in the
// layer info buttons and the row's hover title.
/** "Net across-crest flux, migration mode ⟨Q⊥(αH)⟩" -> "Net across-crest flux, migration mode";
 *  "Drift potential (DP)" -> "Drift potential". */
export function terseQuantity(title: string): string {
  let t = title.trim();
  for (let i = 0; i < 3; i++) {
    const before = t;
    t = t.replace(/\s*\([^()]*\)\s*$/, "").replace(/\s*⟨[^⟩]*⟩\s*$/, "").replace(/\s*\$[^$]*\$\s*$/, "").trim();
    if (t === before) break;
  }
  return t;
}
