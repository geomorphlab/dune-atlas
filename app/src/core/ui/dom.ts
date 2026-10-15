// Tiny DOM helpers. Text and HTML given to h() have their acronyms, symbols and names protected from
// page translators (util/notranslate.ts); not inside elements where a <span> is not allowed (option, …).
import { protectedNodes, protectHtml } from "../util/notranslate";

const PLAIN = new Set(["option", "optgroup", "select", "textarea", "title", "style", "script"]);
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | number | undefined> = {}, ...children: (Node | string | null | undefined)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "html") el.innerHTML = PLAIN.has(tag) ? String(v) : protectHtml(String(v));
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    if (typeof c === "string" && !PLAIN.has(tag)) el.append(...protectedNodes(c));
    else el.append(c);
  }
  return el;
}

let uid = 0;
export const nextId = (p: string) => `${p}-${++uid}`;
