// @vitest-environment happy-dom
// Summary table groups (PI, Oct 2026): collapsible group rows, state remembered per body; titles and members
// as the layer panel's groups; colour bars without notes.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadRegistry } from "../src/registry/load";
import { groupedBody, resetTableGroups, TABLE_GROUPS_KEY, wireTableGroups } from "../src/ui/tablegroups";
import { checkGroupsMatchRegistry } from "./tablegroupslib";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } });
const row = (id: string) => `<tr data-field="${id}"><td class="sym">x</td><th scope="row">${id}</th><td class="num">1</td></tr>`;

describe("summary table groups", () => {
  beforeEach(() => { mem.clear(); resetTableGroups(); });
  it("groups follow the registry (titles, members); no layer has a colour-bar note", () => checkGroupsMatchRegistry(loadRegistry().registry));
  it("rows go to their group, in panel order; unknown rows to the last group; defaults as the layer panel", () => {
    const html = groupedBody(["ufm", "dpm", "at", "qncb", "centre", "dunes", "zzz", "rdpm"].map(row).join(""));
    const d = document.createElement("table"); d.innerHTML = html;
    const groups = [...d.querySelectorAll("tbody.tgroup-rows")].map((b) => [b.getAttribute("data-group"), [...b.querySelectorAll("tr")].map((r) => r.getAttribute("data-field")), (b as HTMLElement).hidden]);
    expect(groups).toEqual([["drift", ["dpm", "rdpm"], false], ["orientation", ["at"], false], ["crest-fluxes", ["qncb"], true], ["wind", ["ufm"], true], ["cell", ["dunes", "centre", "zzz"], false]]);
    expect(d.querySelectorAll("button.tgroup-toggle[aria-expanded]").length).toBe(5);
  });
  it("a click folds / unfolds a group, survives a re-render and is stored", () => {
    const box = document.createElement("div");
    document.body.append(box);
    wireTableGroups(box);
    const render = () => { box.innerHTML = `<table>${groupedBody(["dpm", "qncb"].map(row).join(""))}</table>`; };
    render();
    (box.querySelector('tbody[data-group="drift"] button') as HTMLButtonElement).click();
    expect((box.querySelector("#tg-drift") as HTMLElement).hidden).toBe(true);
    (box.querySelector('tbody[data-group="crest-fluxes"] button') as HTMLButtonElement).click();
    render();   // slider move
    expect((box.querySelector("#tg-drift") as HTMLElement).hidden).toBe(true);
    expect((box.querySelector("#tg-crest-fluxes") as HTMLElement).hidden).toBe(false);
    expect(JSON.parse(mem.get(TABLE_GROUPS_KEY)!)).toMatchObject({ drift: false, "crest-fluxes": true });
    expect(TABLE_GROUPS_KEY).toBe("duneAtlas.cellPanel.tableGroups");
  });
});
