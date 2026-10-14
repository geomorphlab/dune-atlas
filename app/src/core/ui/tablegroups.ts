// Cell summary table: rows in collapsible groups, as the layer panel's groups. The group of a
// row follows its layer group in the registry (tests/tablegroups.test.ts checks titles and membership against the
// registry of both atlases); open / closed is remembered per group and per body ("duneAtlas[Mars].cellPanel.tableGroups").
import { storageKey } from "../body";
import { escapeHtml } from "../util/format";

export interface TableGroup { id: string; title: string; collapsed: boolean; rows: string[] }
/** groups in panel order; `rows` = data-field ids (fields, aux rows and cell facts) */
export const TABLE_GROUPS: TableGroup[] = [
  { id: "drift", title: "Drift potential", collapsed: false, rows: ["dpm", "rdpm", "rdpa", "qha_rdp_dp", "qsdiv"] },
  { id: "orientation", title: "Bedform orientation", collapsed: false, rows: ["at", "ab", "ae", "ao"] },
  { id: "crest-fluxes", title: "Crest-normal/parallel fluxes", collapsed: true, rows: ["qncb", "qacb", "qnlb", "qalb", "qnle", "qale", "qace"] },
  { id: "morphology", title: "Ratios & morphology indices", collapsed: true, rows: ["sige_sigh", "qhab_nl_nc", "qhab_ac_nc", "qhne_ac_nl"] },
  { id: "wind", title: "Wind statistics", collapsed: true, rows: ["uft", "ufm", "qhbf", "qhef", "ut_median", "rho_median"] },
  { id: "related", title: "Related data", collapsed: false, rows: ["ai_mean", "tot_cov_mean", "rho_mean", "elev_mean"] },
  { id: "cell", title: "Cell", collapsed: false, rows: ["dunes", "centre"] },
];
export const TABLE_GROUPS_KEY = storageKey("cellPanel.tableGroups");

let state: Record<string, boolean> | null = null;
/** open state per group: stored choice, else the group's default */
export function tableGroupOpen(): Record<string, boolean> {
  if (!state) {
    state = Object.fromEntries(TABLE_GROUPS.map((g) => [g.id, !g.collapsed]));
    try { const s = JSON.parse(localStorage.getItem(TABLE_GROUPS_KEY) ?? "{}"); for (const g of TABLE_GROUPS) if (typeof s[g.id] === "boolean") state[g.id] = s[g.id]; } catch { /* private mode / bad JSON */ }
  }
  return state;
}
export function setTableGroupOpen(id: string, open: boolean) {
  const s = tableGroupOpen();
  s[id] = open;
  try { localStorage.setItem(TABLE_GROUPS_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}
/** tests: forget the in-memory state */
export function resetTableGroups() { state = null; }

/** Split the table body rows (`<tr data-field="id">…</tr>`) into one header and one row body per group; rows of
 *  unknown ids go to the last group. Each group header is a button (aria-expanded) that shows / hides its rows. */
export function groupedBody(rowsHtml: string): string {
  const rows = [...rowsHtml.matchAll(/<tr data-field="([^"]+)"[\s\S]*?<\/tr>/g)].map((m) => ({ id: m[1], html: m[0] }));
  const open = tableGroupOpen();
  const known = new Set(TABLE_GROUPS.flatMap((g) => g.rows));
  const last = TABLE_GROUPS[TABLE_GROUPS.length - 1].id;
  return TABLE_GROUPS.map((g) => {
    const mine = g.rows.flatMap((id) => rows.filter((r) => r.id === id)).concat(g.id === last ? rows.filter((r) => !known.has(r.id)) : []);
    if (!mine.length) return "";
    const o = open[g.id] !== false, bid = `tg-${g.id}`;
    return `<tbody class="tgroup-head" data-group="${g.id}"><tr><th colspan="3" scope="colgroup"><button type="button" class="tgroup-toggle" aria-expanded="${o}" aria-controls="${bid}">${escapeHtml(g.title)}</button></th></tr></tbody>`
      + `<tbody id="${bid}" class="tgroup-rows" data-group="${g.id}"${o ? "" : " hidden"}>${mine.map((r) => r.html).join("")}</tbody>`;
  }).join("");
}

/** one delegated click handler on the table's container (the table is re-rendered on every slider move) */
export function wireTableGroups(container: HTMLElement) {
  container.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest?.("button.tgroup-toggle") as HTMLButtonElement | null;
    if (!b || !container.contains(b)) return;
    const open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open));
    const rows = container.querySelector(`#${b.getAttribute("aria-controls")}`) as HTMLElement | null;
    if (rows) rows.hidden = !open;
    setTableGroupOpen((b.closest("tbody") as HTMLElement).dataset.group!, open);
  });
}
