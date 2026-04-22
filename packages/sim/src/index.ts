/**
 * @aquascape/sim — Phase 1 v0 growth loop.
 *
 * Public entry point. See README.md for the model block diagram.
 */

export type {
  Species,
  Plant,
  Water,
  Rock,
  ScapeState,
  LightSchedule,
  PlantFrame,
  Frame,
  SimSummary,
  SimTrace,
  LimitingFactor,
} from './types.js';
export { SIM_FRAME_VERSION } from './types.js';
export { photosynthesisPI, lightLimitation } from './photosynthesis.js';
export { monod, liebigMinimum } from './nutrients.js';
export type { LiebigResult, NutrientInputs } from './nutrients.js';
export { temperatureResponse } from './temperature.js';
export type { TempParams } from './temperature.js';
export { computeGrowthRate } from './physics.js';
export type { GrowthRateBreakdown } from './physics.js';
export { rk4Step } from './integrator.js';
export type { RhsFn } from './integrator.js';

import type {
  Frame,
  LightSchedule,
  PlantFrame,
  ScapeState,
  SimTrace,
  Water,
} from './types.js';
import { SIM_FRAME_VERSION } from './types.js';
import { computeGrowthRate } from './physics.js';
import { rk4Step } from './integrator.js';

/**
 * Interpolate hourly PAR schedule linearly so the RK4 substage samples
 * get a smooth forcing (avoids the step discontinuity at hour boundaries).
 */
function parAt(schedule: LightSchedule, tDays: number): number {
  const h = schedule.hourlyPAR;
  if (h.length !== 24) {
    throw new Error(
      `LightSchedule.hourlyPAR must have 24 entries, got ${h.length}`,
    );
  }
  // Fold to [0,24)
  const hourOfDayRaw = (tDays * 24) % 24;
  const hourOfDay = hourOfDayRaw < 0 ? hourOfDayRaw + 24 : hourOfDayRaw;
  const i0 = Math.floor(hourOfDay) % 24;
  const i1 = (i0 + 1) % 24;
  const frac = hourOfDay - Math.floor(hourOfDay);
  const a = h[i0] ?? 0;
  const b = h[i1] ?? 0;
  return a * (1 - frac) + b * frac;
}

export interface SimulateOptions {
  /** Integration step in days. Default 1/24 (hourly). */
  readonly dt?: number;
  /**
   * If true, record one Frame per tick. If false, only summary + last frame.
   * Default true. Phase-2 will add down-sampling.
   */
  readonly recordFrames?: boolean;
}

/**
 * Run the growth simulator forward `durationDays` days.
 *
 * Semantics:
 *   - Initial ScapeState is treated as read-only; the function returns a new
 *     trace without mutating the caller's plants[] or water.
 *   - Water chemistry is held fixed in v0: plants grow but do not draw down
 *     nutrients or CO2. Chemistry coupling lands in Phase 2. Documented as
 *     a known limitation in README.md.
 *   - dt must divide 1 day approximately; we use floor(durationDays/dt)
 *     ticks and allow the final tick to carry any remainder.
 */
export function simulate(
  scape: ScapeState,
  lighting: LightSchedule,
  durationDays: number,
  optsOrDt: SimulateOptions | number = {},
): SimTrace {
  const opts: SimulateOptions =
    typeof optsOrDt === 'number' ? { dt: optsOrDt } : optsOrDt;
  const dt = opts.dt ?? 1 / 24;
  const recordFrames = opts.recordFrames ?? true;

  if (!(dt > 0)) throw new Error(`dt must be > 0, got ${dt}`);
  if (!(durationDays >= 0))
    throw new Error(`durationDays must be ≥ 0, got ${durationDays}`);

  // Defensive clone — simulate must be pure.
  const water: Water = { ...scape.water };
  const biomass: number[] = scape.plants.map((p) => p.biomassG);

  const initialTotalBiomassG = biomass.reduce((s, b) => s + b, 0);

  const frames: Frame[] = [];
  const wallStart = now();

  const ticks = Math.max(1, Math.ceil(durationDays / dt));
  let tDays = 0;

  // Per-plant last-tick diagnostics (filled inside loop).
  const lastLimiting: PlantFrame['limitingFactor'][] = scape.plants.map(
    () => 'none',
  );
  const lastG: number[] = scape.plants.map(() => 0);

  for (let tick = 0; tick < ticks; tick++) {
    const stepDt = Math.min(dt, Math.max(0, durationDays - tDays));
    if (stepDt <= 0) break;

    // Advance each plant independently (no inter-plant coupling in v0).
    for (let i = 0; i < scape.plants.length; i++) {
      const plant = scape.plants[i]!;
      const B0 = biomass[i]!;

      // The RHS freezes the environment except for PAR, which we interpolate
      // from the schedule. All other species-dependent terms are constant
      // during the tick → we can evaluate them once and only re-eval fLight
      // inside the stages. For v0 simplicity, evaluate the full stack each
      // stage; the cost is negligible at these sizes.
      const rhs = (t: number, B: number): number => {
        const par = parAt(lighting, t);
        const br = computeGrowthRate(plant.species, water, par);
        return br.gPerDay * B;
      };

      const B1 = rk4Step(rhs, tDays, B0, stepDt);
      biomass[i] = B1;

      // Record limiter at the tick midpoint for diagnostics.
      const parMid = parAt(lighting, tDays + stepDt / 2);
      const brMid = computeGrowthRate(plant.species, water, parMid);
      lastLimiting[i] = brMid.limiting;
      lastG[i] = brMid.gPerDay;
    }

    tDays += stepDt;

    if (recordFrames) {
      frames.push(buildFrame(scape, biomass, water, tDays, parAt(lighting, tDays), lastG, lastLimiting));
    }
  }

  if (!recordFrames) {
    // Still emit a single terminal frame so consumers have something to render.
    frames.push(
      buildFrame(scape, biomass, water, tDays, parAt(lighting, tDays), lastG, lastLimiting),
    );
  }

  const finalTotalBiomassG = biomass.reduce((s, b) => s + b, 0);
  const wallclockMs = now() - wallStart;

  return {
    frameVersion: SIM_FRAME_VERSION,
    frames,
    summary: {
      durationDays,
      ticks,
      dtDays: dt,
      finalTotalBiomassG,
      initialTotalBiomassG,
      netGrowthG: finalTotalBiomassG - initialTotalBiomassG,
      wallclockMs,
    },
  };
}

function buildFrame(
  scape: ScapeState,
  biomass: readonly number[],
  water: Water,
  tDays: number,
  par: number,
  lastG: readonly number[],
  lastLimiting: readonly PlantFrame['limitingFactor'][],
): Frame {
  const plantFrames: PlantFrame[] = scape.plants.map((p, i) => {
    const B = biomass[i] ?? 0;
    return {
      id: p.id,
      biomassG: B,
      lengthCm: B * p.species.massToLengthCm,
      growthRatePerDay: lastG[i] ?? 0,
      limitingFactor: lastLimiting[i] ?? 'none',
    };
  });
  const totalBiomassG = plantFrames.reduce((s, p) => s + p.biomassG, 0);
  return {
    tDays,
    water: { ...water },
    par,
    plants: plantFrames,
    totalBiomassG,
  };
}

function now(): number {
  // Prefer performance.now() where available for sub-ms resolution.
  const g = globalThis as unknown as { performance?: { now(): number } };
  if (g.performance && typeof g.performance.now === 'function') {
    return g.performance.now();
  }
  return Date.now();
}
