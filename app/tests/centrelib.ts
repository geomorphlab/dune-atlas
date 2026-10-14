// Shared by tests/centre.test.ts and tests/mars/centre.test.ts: 'Centre map on this cell' (PI round 6 item 3).
import { expect, vi } from "vitest";
import { CENTRE_MS, MERCATOR_LAT, MIN_CELL_PX, cellPx, centreOnCell, centreTarget, zoomForCell } from "../src/map/centre";

export function fakeMap(projection: "globe" | "mercator", zoom: number) {
  return { getZoom: () => zoom, getMaxZoom: () => 22, getProjection: () => ({ type: projection }), easeTo: vi.fn(), jumpTo: vi.fn(), flyTo: vi.fn() };
}

/** target and map calls for a mid-latitude and a polar cell in both projections */
export function checkCentre(cellDeg: number, mid: { lon: number; lat: number }, polar: { lon: number; lat: number }) {
  const z0 = zoomForCell(cellDeg);
  expect(cellPx(cellDeg, z0)).toBeCloseTo(MIN_CELL_PX, 9);
  // big enough on screen: zoom kept; too small: just enough zoom to show it at MIN_CELL_PX
  expect(centreTarget(mid, cellDeg, { zoom: z0 + 2, projection: "globe" }, false)).toEqual({ center: [mid.lon, mid.lat], zoom: z0 + 2, duration: CENTRE_MS });
  expect(centreTarget(mid, cellDeg, { zoom: z0 - 3, projection: "mercator" }, false).zoom).toBeCloseTo(z0, 9);
  for (const proj of ["globe", "mercator"] as const) {
    // animated move with the cell centre; bearing / pitch / projection untouched (not passed)
    const m = fakeMap(proj, z0 + 1);
    centreOnCell(m as never, mid, cellDeg, false);
    expect(m.easeTo).toHaveBeenCalledTimes(1);
    const arg = m.easeTo.mock.calls[0][0];
    expect(arg).toMatchObject({ center: [mid.lon, mid.lat], zoom: z0 + 1, duration: CENTRE_MS });
    expect(arg).not.toHaveProperty("bearing"); expect(arg).not.toHaveProperty("pitch");
    expect(m.jumpTo).not.toHaveBeenCalled();
    // prefers-reduced-motion: an instant jump
    const r = fakeMap(proj, z0 - 4);
    centreOnCell(r as never, mid, cellDeg, true);
    expect(r.easeTo).not.toHaveBeenCalled();
    expect(r.jumpTo.mock.calls[0][0].center).toEqual([mid.lon, mid.lat]);
    expect(r.jumpTo.mock.calls[0][0].zoom).toBeCloseTo(z0, 9);
    // polar cell: globe -> the cell centre itself; flat map -> clamped to the Web-Mercator limit
    const p = fakeMap(proj, z0 + 1);
    centreOnCell(p as never, polar, cellDeg, false);
    const c = p.easeTo.mock.calls[0][0].center;
    expect(c[0]).toBe(polar.lon);
    expect(c[1]).toBe(proj === "globe" ? polar.lat : Math.sign(polar.lat) * MERCATOR_LAT);
  }
  // reduced-motion preference read from matchMedia when not given
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
  const g = fakeMap("globe", z0 + 1);
  centreOnCell(g as never, mid, cellDeg);
  expect(g.jumpTo).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
}

/** the header button: next to the title, labelled, calls onCentre with the cell centre; absent without it */
export async function checkHeaderButton(open: (onCentre?: (c: { lon: number; lat: number }) => void) => Promise<{ root: HTMLElement; lon: number; lat: number }>) {
  const onCentre = vi.fn();
  const { root, lon, lat } = await open(onCentre);
  const btn = root.querySelector(".cell-head .centre-btn") as HTMLButtonElement;
  expect(btn).not.toBeNull();
  expect(btn.previousElementSibling?.id).toBe("cell-title");           // directly next to the coordinate title
  expect([btn.getAttribute("aria-label"), btn.title]).toEqual(["Centre map on this cell", "Centre map on this cell"]);
  expect(btn.innerHTML).toMatch(/<svg[^>]+width="18" height="18"/); expect(btn.innerHTML).toMatch(/currentColor/);
  // one-line header: the title has a reserved width and may ellipsise; the button does not shrink
  expect((root.querySelector("#cell-title") as HTMLElement).style.flex).toMatch(/0 1 \d+(\.\d+)?ch/);
  btn.click();
  expect(onCentre).toHaveBeenCalledWith({ lon, lat });
  const { root: r2 } = await open(undefined);
  expect(r2.querySelector(".centre-btn")).toBeNull();
}
