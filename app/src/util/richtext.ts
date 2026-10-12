// Safe links in registry text (descriptions, legend notes, attribution): `[label](https://…)` and
// bare http(s) URLs become links that open in a new tab; every other character is escaped (or
// rendered by `text`, e.g. mathHtml for $…$ TeX). Only http: / https: URLs are linked; anything
// else (javascript:, data:, relative) stays plain text.
import { escapeHtml } from "./format";

const TOKEN = /\[([^\]\n]{1,200})\]\(([^()\s]{1,500})\)|\bhttps?:\/\/[^\s<>"'`]+/gi;

/** URL if it is an absolute http(s) URL, else null */
export function safeHttpUrl(u: string): string | null {
  if (!/^https?:\/\//i.test(u)) return null;
  try { const p = new URL(u); return p.protocol === "http:" || p.protocol === "https:" ? p.href : null; } catch { return null; }
}

function anchor(href: string, labelHtml: string): string {
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${labelHtml}</a>`;
}

/** Render `s` with safe links; `text` renders the non-link parts (default: HTML-escaped). */
export function richHtml(s: string | undefined | null, text: (t: string) => string = escapeHtml): string {
  if (!s) return "";
  let out = "", last = 0;
  for (const m of s.matchAll(TOKEN)) {
    const i = m.index!;
    let whole = m[0], label: string | undefined = m[1], url = m[2] ?? m[0];
    if (label === undefined) {
      // bare URL: keep trailing punctuation outside the link (e.g. "… at https://x.org/.")
      const trail = /[).,;:!?]+$/.exec(url)?.[0] ?? "";
      if (trail && !(trail.startsWith(")") && url.includes("("))) { url = url.slice(0, -trail.length); whole = url; }
    }
    const href = safeHttpUrl(url);
    if (!href) continue; // left as text
    out += text(s.slice(last, i));
    out += anchor(href, label !== undefined ? text(label) : escapeHtml(url.replace(/^https?:\/\//i, "").replace(/\/$/, "")));
    last = i + whole.length;
  }
  return out + text(s.slice(last));
}

/** Plain-text form (downloads, aria): `[label](url)` -> `label (url)`. */
export function richPlain(s: string): string {
  return s.replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^()\s]{1,500})\)/gi, "$1 ($2)");
}
