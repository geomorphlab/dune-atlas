// Language of the atlas: English (source), French or Simplified Chinese. Chosen with the switch in the header,
// `?lang=fr|zh-Hans` in the address (kept in share links) or the last choice in this browser (shared by both
// atlases); never from the browser's language. Changing language reloads the page in the same view.
// Strings: `tr(key, english)` returns the translation of `key` when it was made from this exact English (the
// hash stored with it matches), else the English: an English edit never shows a stale translation
// (tests/i18n.test.ts lists the stale and missing ones). Translations: i18n/fr.json, i18n/zh-Hans.json.
import fr from "./fr.json";
import zh from "./zh-Hans.json";
import { storageKeyFor } from "../core/body";
import { UI, type UiKey } from "./ui";

export type Lang = "en" | "fr" | "zh-Hans";
export const LANGS: { id: Lang; label: string; name: string; html: string }[] = [
  { id: "en", label: "EN", name: "English", html: "en" },
  { id: "fr", label: "FR", name: "Français", html: "fr" },
  { id: "zh-Hans", label: "中文", name: "简体中文", html: "zh-Hans" },
];
export interface Entry { text: string; en: string }
export type Dict = Record<string, Entry>;
export const DICTS: Record<Exclude<Lang, "en">, Dict> = { fr: fr as Dict, "zh-Hans": zh as Dict };
/** one setting for both atlases (Earth's key; the language is the reader's, not the planet's) */
export const LANG_KEY = storageKeyFor("earth", "lang");

export const isLang = (s: unknown): s is Lang => s === "en" || s === "fr" || s === "zh-Hans";
export function resolveLang(search: string, stored: string | null): Lang {
  const q = new URLSearchParams(search).get("lang");
  if (isLang(q)) return q;
  return isLang(stored) ? stored : "en";
}
function readStored(): string | null { try { return localStorage.getItem(LANG_KEY); } catch { return null; } }
export const LANG: Lang = typeof location === "undefined" ? "en" : resolveLang(location.search, readStored());

/** 32-bit FNV-1a of the English, as 8 hex digits: identifies the English a translation was made from */
export function enHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

/** translation of `key` in `lang` if made from this English, else the English */
export function trIn(lang: Lang, key: string, en: string): string {
  if (lang === "en") return en;
  const e = DICTS[lang][key];
  return e && e.en === enHash(en) ? e.text : en;
}
export const tr = (key: string, en: string) => trIn(LANG, key, en);
/** an interface string of i18n/ui.ts in the current language */
export const t = (key: UiKey) => tr(key, UI[key]);
/** fill {name} placeholders (after translation, so translators move them, not the values) */
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** `<html lang>` of the page */
export function applyHtmlLang(doc: Document = document) {
  doc.documentElement.lang = LANGS.find((l) => l.id === LANG)!.html;
}

/** remember the choice and reload in the same view with `lang` in the address (none for English) */
export function switchLang(to: Lang, loc: Pick<Location, "search" | "pathname" | "hash" | "assign"> = location) {
  try { localStorage.setItem(LANG_KEY, to); } catch { /* private mode */ }
  const q = new URLSearchParams(loc.search);
  if (to === "en") q.delete("lang"); else q.set("lang", to);
  const s = q.toString().replace(/%2C/g, ",").replace(/%3A/g, ":").replace(/%3D/g, "=");
  loc.assign(`${loc.pathname}${s ? `?${s}` : ""}${loc.hash}`);
}

// ---- Text keyed by its own English (popovers, About, cell panel, exports) ----
// trc(english) looks the translation up by the fingerprint of the English itself (key "c.<hash>"): an edit
// of the English makes a new key, so a stale translation can never be shown. The strings are collected from a
// full render of each atlas (npm run i18n -> tests/i18ncollect.test.ts -> src/i18n/collected-<body>.json).
/** set by tests/i18ncollect.test.ts: every English text passed to trc / trBlocks, with its area */
export const COLLECTED = new Map<string, string>();
export const contentKey = (en: string) => `c.${enHash(en)}`;
export function trc(en: string, area = "Other"): string {
  if (!en || !/\p{L}/u.test(en)) return en;
  if ((globalThis as { __I18N_COLLECT__?: boolean }).__I18N_COLLECT__ && !COLLECTED.has(en)) COLLECTED.set(en, area);
  return trIn(LANG, contentKey(en), en);
}
/** trc on text whose plain numbers vary (export captions, labels): the numbers become ⟦#0⟧ … in the key */
export function trNum(text: string, area = "Exported images"): string {
  if (LANG === "en" && !(globalThis as { __I18N_COLLECT__?: boolean }).__I18N_COLLECT__) return text;
  const nums: string[] = [];
  const tpl = text.replace(/(?<![\p{L}\p{N}_.,])[-−]?\d+(?:[.,]\d+)*(?![\p{L}\p{N}_])/gu, (m) => { nums.push(m); return `⟦#${nums.length - 1}⟧`; });
  return trc(tpl, area).replace(/⟦#(\d+)⟧/g, (_m, i) => nums[Number(i)] ?? "");
}
/** trc on a template with {placeholders}, then filled */
export const trcf = (en: string, vars: Record<string, string | number>, area = "Other") => fill(trc(en, area), vars);

const BLOCK = /<(p|li|h3|h4|dt|dd|summary|figcaption|strong)(\s[^>]*)?>((?:(?!<\/?\1[\s>])[\s\S])*?)<\/\1>/g;
/** translate each text block of an HTML fragment (paragraph, list item, heading, definition term or value) as
 *  one unit; blocks marked translate="no", and text outside blocks, are kept */
export function trBlocks(html: string, area: string): string {
  if (LANG === "en" && !(globalThis as { __I18N_COLLECT__?: boolean }).__I18N_COLLECT__) return html;
  return html.replace(BLOCK, (m, tag: string, attrs: string | undefined, inner: string) => {
    if (/translate="no"/.test(attrs ?? "") || !/\p{L}/u.test(inner.replace(/<[^>]+>/g, ""))) return m;
    // a list item holding a nested list: translate only up to the nested list
    const cut = inner.search(/<(ul|ol|dl)[\s>]/);
    if (cut >= 0) return `<${tag}${attrs ?? ""}>${trc(inner.slice(0, cut), area)}${inner.slice(cut)}</${tag}>`;
    return `<${tag}${attrs ?? ""}>${trc(inner, area)}</${tag}>`;
  });
}
