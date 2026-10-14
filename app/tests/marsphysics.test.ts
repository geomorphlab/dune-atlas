// TS Mars physics vs pipeline mars/physics.py (fixture: tests/fixtures/mars-physics-parity.json).
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/mars-physics-parity.json";
import { airState, D_VALUES, flux, frictionVelocity, layerHeight, M, threshold, uPlus, viscosity } from "../src/cell/marsphysics";

interface Row { [k: string]: number }
const F = fixture as unknown as { ak: [number, number, number, number]; n_positive: number; rows: Row[]; profile: { x: number[]; u_plus: number[] } };
const close = (a: number, b: number, rtol = 1e-12, atol = 1e-300) => Math.abs(a - b) <= atol + rtol * Math.abs(b);

describe("Mars physics parity", () => {
  it("fixture covers transport and no-transport hours", () => {
    expect(F.rows.length).toBeGreaterThanOrEqual(300);
    expect(F.n_positive).toBeGreaterThan(50);
    expect(F.rows.length - F.n_positive).toBeGreaterThan(50);
  });
  it("axis and constants", () => {
    expect(D_VALUES.length).toBe(64);
    expect(M.D_VALUES_UM[M.D_DEFAULT_INDEX]).toBe(200);
    expect(M.PACKING).toBe(0.6); // fluxes are volumes of packed sand, q = Q/(rho_p phi)
  });
  it("eq. 2.2 profile matches Python incl. both extrapolations", () => {
    F.profile.x.forEach((x, i) => expect(close(uPlus(x), F.profile.u_plus[i], 1e-12)).toBe(true));
  });
  it("matches Python per hour", () => {
    for (const r of F.rows) {
      expect(close(layerHeight(r.ps, r.T, ...F.ak), r.z, 1e-12)).toBe(true);
      expect(close(viscosity(r.T) / r.rho, r.nu, 1e-12)).toBe(true);
      const { ustar, ua } = frictionVelocity(r.u, r.v, r.z, r.nu);
      expect(close(ustar, r.ustar, 1e-12)).toBe(true);
      expect(close(ua, r.ua)).toBe(true);
      expect(close(viscosity(r.T), r.mu)).toBe(true);
      const th = threshold(r.d, r.rho, r.T);
      expect(close(th.ut, r.ut, 1e-11)).toBe(true);
      expect(close(th.dstar, r.dstar, 1e-11)).toBe(true);
      expect(close(th.kn, r.kn, 1e-11)).toBe(true);
      expect(close(th.fkn, r.fkn, 1e-11)).toBe(true);
      expect(close(th.gaSqrtS, r.ga_sqrt_s, 1e-11)).toBe(true);
      expect(close(threshold(r.d, r.rho, r.T, false).ut, r.ut_nokn, 1e-11)).toBe(true);
      expect(close(flux(ustar, r.d, r.rho, r.T), r.q, 1e-10)).toBe(true);
      expect(close(flux(ustar, r.d, r.rho, r.T, threshold(r.d, r.rho, r.T, false)), r.q_nokn, 1e-10)).toBe(true);
      const a = airState(r.ps, r.T, ...F.ak);
      expect(close(a.p, r.p)).toBe(true);
      expect(close(a.rho, r.rho_air)).toBe(true);
    }
  });
});
