/**
 * Fourth-order Runge-Kutta integrator for the per-plant biomass ODE.
 *
 *   dB/dt = g(t, state) · B   with g frozen over a tick (water + light slowly varying).
 *
 * Why RK4? The ODE is stiff whenever biomass is small (exponential ramp-up)
 * and forward-Euler at hourly Δt overshoots during "lights on" transitions,
 * leading to biomass spikes then dips — a pattern that produced phantom
 * oscillations in an earlier prototype. RK4 damps this at negligible cost
 * because `g` is reused across stages when the environment is held fixed.
 *
 * Monotonicity guarantee: after the step we clamp biomass to [0, +∞).
 * This is the only place the package is allowed to apply a nonnegativity
 * projection — everywhere else math is free to go negative and we'll know.
 */

export type RhsFn = (t: number, B: number) => number;

export function rk4Step(f: RhsFn, t: number, B: number, dt: number): number {
  const k1 = f(t, B);
  const k2 = f(t + dt / 2, B + (dt * k1) / 2);
  const k3 = f(t + dt / 2, B + (dt * k2) / 2);
  const k4 = f(t + dt, B + dt * k3);
  const next = B + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  return next < 0 ? 0 : next;
}
