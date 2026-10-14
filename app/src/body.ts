// Which planet this build shows, and the link to the other one. The same UI is built twice: Earth
// (default) at the site root and Mars (VITE_BODY=mars, VITE_BASE=/mars/) at /mars/ on the same origin
// (docs/guide/mars.md). Used by the header label, the planet toggle and the browser-storage keys.
export type Body = "earth" | "mars";

const env = (import.meta.env ?? {}) as Partial<Record<string, string>>;

export const BODY: Body = env.VITE_BODY === "mars" ? "mars" : "earth";
export const bodyName = (b: Body) => (b === "mars" ? "Mars" : "Earth");
export const otherBody = (b: Body): Body => (b === "mars" ? "earth" : "mars");
export const BODY_NAME = bodyName(BODY);

/** localStorage / sessionStorage key of this build. Earth keys are unchanged (duneAtlas.<name>);
 *  Mars keys are duneAtlasMars.<name>, so the two atlases on one origin never share state (tour seen,
 *  dataset choice, panel layout). */
export const storageKeyFor = (b: Body, name: string) => `${b === "mars" ? "duneAtlasMars" : "duneAtlas"}.${name}`;
export const storageKey = (name: string) => storageKeyFor(BODY, name);

/** Live site: the target of the planet button on a local dev / preview server, where the derived
 *  same-origin URL would point at the build itself or at nothing. */
export const LIVE_SITE = "https://map.geomorphlab.org/";
export const isLocalHost = (h: string | undefined) => !!h && /^(localhost|127(?:\.\d+){3}|\[?::1\]?|0\.0\.0\.0)$/i.test(h);

/** URL of the other atlas (no position carried; `?embed=1` carried when active; `resume=1`: the other atlas
 *  reopens its own last view if it has one, else its default view - defaultview.ts resumeQuery).
 *  Production (same origin): Earth -> `<base>mars/`; Mars -> its base without the trailing `mars/` (the
 *  site root). On localhost / 127.0.0.1 (vite dev or preview) the other atlas is the LIVE site: Earth ->
 *  https://map.geomorphlab.org/mars/, Mars -> https://map.geomorphlab.org/. `override`
 *  (VITE_OTHER_BODY_URL, e.g. http://localhost:5174/ for two dev servers) replaces the derived URL. */
export function otherBodyUrl(o: { body?: Body; base?: string; override?: string; embed?: boolean; host?: string; resume?: boolean } = {}): string {
  const body = o.body ?? BODY;
  const base = (o.base ?? env.BASE_URL ?? "/").replace(/\/*$/, "/");
  let url = o.override || env.VITE_OTHER_BODY_URL || "";
  if (!url && isLocalHost(o.host ?? globalThis.location?.hostname)) url = body === "mars" ? LIVE_SITE : `${LIVE_SITE}mars/`;
  if (!url) url = body === "mars" ? base.replace(/mars\/$/, "") || "/" : `${base}mars/`;
  const q = [o.embed ? "embed=1" : "", o.resume ? "resume=1" : ""].filter(Boolean).join("&");
  return q ? `${url}${url.includes("?") ? "&" : "?"}${q}` : url;
}

/** is the current page in embed mode (?embed=1)? */
export const isEmbedded = (search = globalThis.location?.search ?? "") => new URLSearchParams(search).get("embed") === "1";
