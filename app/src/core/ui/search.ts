// Search box at the top of the layer panel (both atlases, embed mode included; visible with the layer
// list collapsed). Typed coordinates (core/search/coords.ts) are read as the visitor types, with the
// result or the reason they cannot be read below the field; Enter (or the button) flies there and opens
// the cell panel when the cell has data. Named places (core/search/places.ts) are offered only when the
// body's place list is enabled; until then the field takes coordinates only.
import { h, nextId } from "./dom";
import { formatCoord, parseCoordinates, type LonRange } from "../search/coords";
import { matchPlaces, PLACE_TEXT, type Place, type PlaceHit } from "../search/places";

export interface SearchOptions {
  /** the body's longitude convention: Earth -180..180, Mars 0..360 east-positive */
  lonRange: LonRange;
  /** shown under the field: the coordinate convention (e.g. Mars: planetocentric, east-positive) */
  conventionNote?: string;
  /** example in the placeholder */
  example: string;
  /** named places; `enabled: false` hides the named search */
  places: { enabled: boolean; places: Place[] };
  /** fly to a typed point; resolves to the line shown afterwards (cell panel opened, no data, ...) */
  goTo(lat: number, lon: number): Promise<string>;
  /** fly to a named place */
  goToPlace(p: Place): Promise<string> | string;
  /** the naming note (HTML), opened by 'About these names' under the results */
  namesNoteHtml?: string;
}

export const SEARCH_TEXT = {
  label: "Search coordinates",
  labelPlaces: "Search places or coordinates",
  button: "Go",
  read: "Go to",
  cannotRead: "Cannot read:",
  noPlace: "No place or coordinates match.",
};

const ICON = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12.4 12.4l4.4 4.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

export class SearchBox {
  readonly el: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly status: HTMLElement;
  readonly list: HTMLUListElement;
  /** 'About these names' under the results, and the note it opens */
  readonly namesFoot: HTMLElement;
  readonly namesNote: HTMLElement;
  #o: SearchOptions;
  #hits: PlaceHit[] = [];
  #active = -1;
  #busy = false;

  constructor(o: SearchOptions) {
    this.#o = o;
    const named = o.places.enabled && o.places.places.length > 0;
    const id = nextId("atlas-search"), sid = `${id}-status`, lid = `${id}-list`, nid = `${id}-note`;
    const label = named ? SEARCH_TEXT.labelPlaces : SEARCH_TEXT.label;
    this.input = h("input", { type: "search", id, class: "search-input", autocomplete: "off", spellcheck: "false", enterkeyhint: "go",
      placeholder: named ? `Place or ${o.example}` : o.example, "aria-describedby": o.conventionNote ? `${sid} ${nid}` : sid,
      ...(named ? { role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": lid } : {}) }) as HTMLInputElement;
    const go = h("button", { type: "submit", class: "search-go", "aria-label": SEARCH_TEXT.button, title: SEARCH_TEXT.button, html: ICON });
    this.status = h("p", { id: sid, class: "help search-status", role: "status", "aria-live": "polite", hidden: true });
    this.list = h("ul", { id: lid, class: "search-results", role: "listbox", "aria-label": "Places", hidden: true }) as HTMLUListElement;
    const noteId = `${id}-names-note`;
    this.namesNote = h("p", { id: noteId, class: "help search-names-note", hidden: true, html: o.namesNoteHtml ?? "" });
    const about = h("button", { type: "button", class: "link-button search-names-link", "aria-expanded": "false", "aria-controls": noteId }, PLACE_TEXT.aboutNames) as HTMLButtonElement;
    about.addEventListener("pointerdown", (e) => e.preventDefault());   // keep the focus (and the results) in the field
    about.addEventListener("click", () => { const open = this.namesNote.hidden; this.namesNote.hidden = !open; about.setAttribute("aria-expanded", String(open)); });
    this.namesFoot = h("div", { class: "search-names-foot", hidden: true }, about, this.namesNote);
    this.el = h("form", { class: "atlas-search", role: "search", "aria-label": label },
      h("label", { for: id, class: "visually-hidden" }, label),
      h("div", { class: "search-row" }, this.input, go),
      this.list, ...(named && o.namesNoteHtml ? [this.namesFoot] : []), this.status,
      ...(o.conventionNote ? [h("p", { id: nid, class: "help search-note" }, o.conventionNote)] : [])) as HTMLFormElement;
    this.el.addEventListener("submit", (e) => { e.preventDefault(); void this.submit(); });
    this.input.addEventListener("input", () => this.preview());
    this.input.addEventListener("keydown", (e) => this.#key(e));
  }

  #say(text: string, kind: "ok" | "error" | "info" = "info") {
    this.status.textContent = text;
    this.status.hidden = !text;
    this.status.dataset.kind = kind;
  }

  /** feedback while typing: the point that Enter would go to, or why the text cannot be read */
  preview() {
    const t = this.input.value.trim();
    this.#showHits([]);
    if (!t) { this.#say(""); return; }
    const r = parseCoordinates(t, this.#o.lonRange);
    if (r.ok) { this.#say(`${SEARCH_TEXT.read} ${formatCoord(r.lat, r.lon, this.#o.lonRange)}${r.note ? ` (${r.note})` : ""}`, "ok"); return; }
    if (this.#named() && /\p{L}/u.test(t) && !/^\s*[-+\d.]/.test(t)) {
      const hits = matchPlaces(t, this.#o.places.places);
      this.#showHits(hits);
      this.#say(hits.length ? "" : SEARCH_TEXT.noPlace, hits.length ? "info" : "error");
      return;
    }
    this.#say(`${SEARCH_TEXT.cannotRead} ${r.error}.`, "error");
  }

  #named() { return this.#o.places.enabled && this.#o.places.places.length > 0; }

  #showHits(hits: PlaceHit[]) {
    this.#hits = hits;
    this.#active = hits.length ? 0 : -1;
    this.list.replaceChildren(...hits.map((x, i) => {
      const p = x.place;
      const li = h("li", { id: `${this.list.id}-${i}`, role: "option", class: "search-hit", "aria-selected": String(i === this.#active) },
        h("span", { class: "hit-line1" }, p.line1),
        ...(p.type ? [h("span", { class: "hit-type" }, p.type)] : []),
        // found by another name (alternative name, sub-unit): say which
        ...(x.kind === "alias" ? [h("span", { class: "hit-alias", dir: "auto" }, x.matched)] : []),
        ...(p.line2 ? [h("span", { class: "hit-line2", lang: p.line2.lang }, p.line2.text)] : []),
        ...(p.countries?.length ? [h("span", { class: "hit-country" }, p.countries.join(", "))] : []));
      li.addEventListener("pointerdown", (e) => { e.preventDefault(); void this.#pick(i); });
      return li;
    }));
    this.list.hidden = !hits.length;
    this.namesFoot.hidden = !hits.length;
    if (!hits.length) { this.namesNote.hidden = true; this.namesFoot.querySelector("button")?.setAttribute("aria-expanded", "false"); }
    if (this.#named()) {
      this.input.setAttribute("aria-expanded", String(!!hits.length));
      if (hits.length) this.input.setAttribute("aria-activedescendant", `${this.list.id}-0`); else this.input.removeAttribute("aria-activedescendant");
    }
  }

  #key(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (!this.list.hidden) { e.preventDefault(); this.#showHits([]); return; }
      if (this.input.value) { e.preventDefault(); this.input.value = ""; this.#say(""); }
      return;
    }
    if (!this.#hits.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    const n = this.#hits.length;
    this.#active = (this.#active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
    [...this.list.children].forEach((c, i) => c.setAttribute("aria-selected", String(i === this.#active)));
    this.input.setAttribute("aria-activedescendant", `${this.list.id}-${this.#active}`);
  }

  async #pick(i: number) {
    const p = this.#hits[i]?.place;
    if (!p) return;
    this.#showHits([]);
    this.input.value = p.line1;
    this.#say(await this.#o.goToPlace(p), "ok");
  }

  /** Enter / the button: go to the coordinates, or to the highlighted place */
  async submit() {
    if (this.#busy) return;
    const t = this.input.value.trim();
    const r = parseCoordinates(t, this.#o.lonRange);
    if (!r.ok) {
      if (this.#hits.length && this.#active >= 0) { await this.#pick(this.#active); return; }
      this.preview();
      this.input.focus();
      return;
    }
    this.#busy = true;
    try {
      const where = formatCoord(r.lat, r.lon, this.#o.lonRange);
      this.#say(`${SEARCH_TEXT.read} ${where}…`, "ok");
      this.#say(await this.#o.goTo(r.lat, r.lon), "ok");
    } catch (e) {
      this.#say(`Could not go there: ${(e as Error)?.message ?? e}`, "error");
    } finally { this.#busy = false; }
  }
}

/** Zoom that shows a grid cell about 16 px wide (512 px tiles), within 2..8 */
export function searchZoom(cellDeg: number): number {
  const z = Math.log2(11.25 / Math.max(1e-6, Math.abs(cellDeg)));
  return Math.max(2, Math.min(8, Math.round(z * 2) / 2));
}
