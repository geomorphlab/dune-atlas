// Tour steps that demonstrate the UI: "layers" opens the Display options of a direction layer
// (RDD) in its group; "cell" opens the cell panel for an example dune cell. Both restore the exact
// previous state when the step is left (Next, Back, Skip, Esc, click outside). No layer is added
// to the map and the map view does not move.
import type { Store } from "../store";
import type { CellPanel } from "./cellPanel";
import type { TourHooks } from "./tour";
import { TOUR_FALLBACK } from "./helpText";
import { layerPanelOpen, setLayerPanelOpen } from "./layerPanel";

export interface TourHookDeps {
  layerPanel: HTMLElement;
  store: Store;
  panel: CellPanel;
  cellRoot: HTMLElement;
  /** the example cell (grid indices) of the current wind dataset, or null if unavailable */
  exampleCell: () => Promise<[number, number] | null>;
  /** max wait for the example cell (ms) */
  timeoutMs?: number;
}

export const DEMO_LAYER = "rdpa";
/** outlined in the cell step: the panel's own u*,th slider and the Download & cite section */
export const TOUR_OUTLINED = '.cell-threshold, [data-section="downloads"]';

const frame = () => new Promise<void>((r) => (typeof globalThis.requestAnimationFrame === "function" ? globalThis.requestAnimationFrame(() => r()) : setTimeout(r, 16)));
const until = async (f: () => boolean, ms: number) => {
  const t0 = Date.now();
  while (!f()) { if (Date.now() - t0 > ms) return false; await new Promise((r) => setTimeout(r, 30)); }
  return true;
};

export function tourHooks(d: TourHookDeps): Record<string, TourHooks> {
  let layersSaved: { collapsed: boolean; group: boolean | null; display: boolean | null; scroll: number } | null = null;
  let cellSaved: { cell: [number, number] | null; scroll: number; cellH: string; hidden: boolean } | null = null;
  const q = <T extends Element>(sel: string, r: ParentNode = d.layerPanel) => r.querySelector(sel) as T | null;
  return {
    layers: {
      async enter() {
        const body = q<HTMLElement>(".panel-body");
        const item0 = q<HTMLElement>(`.layer-item[data-layer="${DEMO_LAYER}"]`);
        layersSaved = {
          collapsed: !layerPanelOpen(d.layerPanel),
          group: (item0?.closest("details.layer-group") as HTMLDetailsElement | null)?.open ?? null,
          display: (item0?.querySelector("details.display-opts") as HTMLDetailsElement | null)?.open ?? null,
          scroll: body?.scrollTop ?? 0,
        };
        // open the layer list first (as the Layers button does), let it lay out, then the group,
        // RDD's Display section, and bring it into view
        if (layersSaved.collapsed) { setLayerPanelOpen(d.layerPanel, true); await frame(); }
        const item = q<HTMLElement>(`.layer-item[data-layer="${DEMO_LAYER}"]`);
        const group = item?.closest("details.layer-group") as HTMLDetailsElement | null;
        const disp = item?.querySelector("details.display-opts") as HTMLDetailsElement | null;
        if (group) group.open = true;
        if (disp) disp.open = true;
        item?.classList.add("tour-demo");
        await frame();
        // centre it in the scrolling list (only the list scrolls: the page and the map do not move)
        const b = q<HTMLElement>(".panel-body");
        if (item && b) {
          const ir = item.getBoundingClientRect(), br = b.getBoundingClientRect();
          b.scrollTop = Math.max(0, b.scrollTop + ir.top - br.top - Math.max(0, (b.clientHeight - ir.height) / 2));
        }
      },
      leave() {
        const s = layersSaved;
        layersSaved = null;
        if (!s) return;
        const item = q<HTMLElement>(`.layer-item[data-layer="${DEMO_LAYER}"]`);
        item?.classList.remove("tour-demo");
        const group = item?.closest("details.layer-group") as HTMLDetailsElement | null;
        const disp = item?.querySelector("details.display-opts") as HTMLDetailsElement | null;
        if (disp && s.display !== null) disp.open = s.display;
        if (group && s.group !== null) group.open = s.group;
        const body = q<HTMLElement>(".panel-body");
        if (body) body.scrollTop = s.scroll;
        if (s.collapsed) setLayerPanelOpen(d.layerPanel, false);
      },
    },
    cell: {
      async enter() {
        const root = document.documentElement;
        cellSaved = { cell: d.store.state.cell, scroll: d.panel.scrollTop, cellH: root.style.getPropertyValue("--cell-h"), hidden: d.cellRoot.hidden };
        // mobile bottom sheet: the default height for the example
        root.style.removeProperty("--cell-h");
        let c: [number, number] | null = null;
        try { c = await d.exampleCell(); } catch { c = null; }
        if (!c) return TOUR_FALLBACK.cell;
        d.store.set({ cell: c });
        const ok = await until(() => !!d.cellRoot.querySelector(".cell-body .summary table, .cell-body .empty-state, .status.error"), d.timeoutMs ?? 15000);
        for (const el of d.cellRoot.querySelectorAll(TOUR_OUTLINED)) el.classList.add("tour-outline");
        if (!ok || d.cellRoot.querySelector(".status.error")) return TOUR_FALLBACK.cell;
      },
      async leave() {
        const s = cellSaved;
        cellSaved = null;
        for (const el of d.cellRoot.querySelectorAll(TOUR_OUTLINED)) el.classList.remove("tour-outline");
        if (!s) return;
        const root = document.documentElement;
        if (s.cellH) root.style.setProperty("--cell-h", s.cellH); else root.style.removeProperty("--cell-h");
        const cur = d.store.state.cell;
        if (s.cell && cur && s.cell[0] === cur[0] && s.cell[1] === cur[1]) { d.panel.scrollTop = s.scroll; return; }
        d.store.set({ cell: s.cell });
        if (s.cell) {
          // the previous cell re-renders at the top (another location): put its scroll back
          const want = s.cell;
          await until(() => { const sc = d.panel.shownCell; return !!sc && sc.iy === want[0] && sc.ix === want[1] && !!d.cellRoot.querySelector(".cell-body .summary table, .cell-body .empty-state"); }, d.timeoutMs ?? 15000);
          d.panel.scrollTop = s.scroll;
        }
      },
    },
  };
}
