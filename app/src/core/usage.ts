// Download counter: one small message per download (or copy) to the atlas's usage counter
// (workers/usage, docs/guide/usage-counter.md). The message holds only the export type, the planet and the
// file size: no file name, no place, no time, no identifier. The counter adds it to the day's total for the
// visitor's country. Nothing is sent when VITE_USAGE_URL is not set (dev server, tests, and builds until
// the counter is set up).
import { BODY, type Body } from "./body";

export type UsageType = "map-image" | "region" | "cell-netcdf" | "cell-csv" | "citation" | "plot" | "copy-code" | "copy-citation";

const env = (import.meta.env ?? {}) as Partial<Record<string, string>>;
/** counter address from the build (VITE_USAGE_URL, e.g. https://dune-atlas-usage.<subdomain>.workers.dev/event) */
export const USAGE_URL = (env.VITE_USAGE_URL ?? "").trim();

/** export type of a downloaded file, from its name (names: mapExport.ts, main.ts runRegion, cellPanel.ts,
 *  plotExport.ts); null for a name the counter does not know */
export function downloadType(name: string): UsageType | null {
  const n = name.toLowerCase();
  if (/^(mars-)?dune-atlas_region_.*\.zip$/.test(n)) return "region";
  if (/^(mars-)?dune-atlas_map_.*\.png$/.test(n)) return "map-image";
  if (n.endsWith("_citation.txt")) return "citation";
  if (n.endsWith(".nc")) return "cell-netcdf";
  if (n.endsWith(".zip")) return "cell-csv";
  if (/\.(png|svg)$/.test(n)) return "plot";
  return null;
}

/** the message: {"type":…,"body":…,"bytes":…} (bytes a whole number, 0 for copies) */
export function usageMessage(type: UsageType, body: Body, bytes = 0): string {
  const b = type.startsWith("copy-") || !Number.isFinite(bytes) || bytes < 0 ? 0 : Math.round(bytes);
  return JSON.stringify({ type, body, bytes: b });
}

export interface UsageDeps {
  url?: string;
  body?: Body;
  nav?: { sendBeacon?: (url: string, data: string) => boolean };
  fetch?: (url: string, init: RequestInit) => Promise<unknown>;
}

/** send one count; returns whether a message was handed to the browser. Plain text (a "simple" request:
 *  no permission check by the browser first), no cookies; a failure is ignored, so a blocked or
 *  unreachable counter never affects the download. */
export function sendUsage(type: UsageType, bytes = 0, deps: UsageDeps = {}): boolean {
  const url = deps.url ?? USAGE_URL;
  if (!url) return false;
  const msg = usageMessage(type, deps.body ?? BODY, bytes);
  try {
    const nav = deps.nav ?? (globalThis.navigator as UsageDeps["nav"]);
    if (nav?.sendBeacon && nav.sendBeacon(url, msg)) return true;
    const f = deps.fetch ?? globalThis.fetch;
    if (!f) return false;
    void Promise.resolve(f(url, { method: "POST", body: msg, keepalive: true, mode: "cors", credentials: "omit", headers: { "Content-Type": "text/plain;charset=UTF-8" } })).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/** count a download by its file name and size (called by announceDownload) */
export function countDownload(name: string, bytes: number, deps?: UsageDeps): boolean {
  const type = downloadType(name);
  return type ? sendUsage(type, bytes, deps) : false;
}

/** count a copy to the clipboard (Copy code, Copy citation) */
export function countCopy(type: "copy-code" | "copy-citation", deps?: UsageDeps): boolean {
  return sendUsage(type, 0, deps);
}
