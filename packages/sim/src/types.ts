/**
 * @aquascape/sim — Core shared types.
 *
 * Frame schema is versioned via `frameVersion` so the renderer can
 * reject incompatible traces early. Bump on any non-additive change.
 */

export const SIM_FRAME_VERSION = 0 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Species / plant definitions (v0 — a narrow subset of the full envelope)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Species envelope. In production these come from `@aquascape/data/plants.json`.
 * v0 keeps only what the equations in §1-4 of the README actually consume.
 *
 * Units:
 *   pMaxPerDay      — max gross specific growth (1/day) at light saturation,
 *                     CO2 saturation, optimal T, all nutrients replete.
 *   alphaPerPAR     — initial P-I slope (1/day per µmol·m⁻²·s⁻¹).
 *   kCO2Mg          — Michaelis constant for free CO2 (mg/L).
 *   kN/P/K/Fe       — Monod half-saturation constants (mg/L).
 *   tOptC           — optimum temperature (°C).
 *   tSigmaLowC      — std dev of bell curve below optimum (°C).
 *   tSigmaHighC     — std dev above optimum; rapid falloff → smaller value.
 *   q10Below        — Q10 multiplier below optimum (typically ≈ 2).
 *   respirationPerDay — specific maintenance respiration rate r (1/day).
 *   massToLengthCm  — linear coefficient: stem length_cm = biomass_g * k.
 *                     v0 is intentionally simple; real allocation curves
 *                     ship in Phase 2.
 */
export interface Species {
  readonly id: string;
  readonly commonName: string;
  readonly pMaxPerDay: number;
  readonly alphaPerPAR: number;
  readonly kCO2Mg: number;
  readonly kN: number;
  readonly kP: number;
  readonly kK: number;
  readonly kFe: number;
  readonly tOptC: number;
  readonly tSigmaLowC: number;
  readonly tSigmaHighC: number;
  readonly q10Below: number;
  readonly respirationPerDay: number;
  readonly massToLengthCm: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scape / tank / water state
// ─────────────────────────────────────────────────────────────────────────────

export interface Plant {
  readonly id: string;
  readonly species: Species;
  /** Wet biomass in grams. */
  biomassG: number;
  /** Anchor position in tank coords (cm). Optional — renderer uses it, sim doesn't (v0). */
  readonly position?: { x: number; y: number; z: number };
}

export interface Water {
  temperatureC: number;
  /** Free CO2 (mg/L). Derivable from pH+KH in later versions. */
  co2Mg: number;
  /** Nitrate (mg/L). */
  nMg: number;
  /** Phosphate (mg/L). */
  pMg: number;
  /** Potassium (mg/L). */
  kMg: number;
  /** Iron (mg/L). */
  feMg: number;
}

export interface Rock {
  readonly id: string;
  readonly position: { x: number; y: number; z: number };
  readonly radiusCm: number;
}

export interface ScapeState {
  /** Tank water volume in litres. */
  readonly tankL: number;
  readonly plants: readonly Plant[];
  readonly water: Water;
  readonly hardscape: readonly Rock[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Lighting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 24-entry array: PAR (µmol·m⁻²·s⁻¹) at each hour-of-day (0..23).
 * v0 assumes horizontal uniformity; attenuation with depth/shading
 * is deferred to Phase 2.
 */
export interface LightSchedule {
  readonly hourlyPAR: readonly number[]; // length must be 24
}

// ─────────────────────────────────────────────────────────────────────────────
// Trace / frames
// ─────────────────────────────────────────────────────────────────────────────

export interface PlantFrame {
  readonly id: string;
  readonly biomassG: number;
  readonly lengthCm: number;
  /**
   * Last-tick effective specific gross growth rate (1/day).
   * Useful for stress diagnostics.
   */
  readonly growthRatePerDay: number;
  /** Which nutrient was scarcest this tick ('light'|'co2'|'temp'|'N'|'P'|'K'|'Fe'). */
  readonly limitingFactor: LimitingFactor;
}

export type LimitingFactor =
  | 'light'
  | 'co2'
  | 'temp'
  | 'N'
  | 'P'
  | 'K'
  | 'Fe'
  | 'none';

export interface Frame {
  readonly tDays: number;
  readonly water: Water;
  readonly par: number;
  readonly plants: readonly PlantFrame[];
  readonly totalBiomassG: number;
}

export interface SimSummary {
  readonly durationDays: number;
  readonly ticks: number;
  readonly dtDays: number;
  readonly finalTotalBiomassG: number;
  readonly initialTotalBiomassG: number;
  readonly netGrowthG: number;
  readonly wallclockMs: number;
}

export interface SimTrace {
  readonly frameVersion: typeof SIM_FRAME_VERSION;
  readonly frames: readonly Frame[];
  readonly summary: SimSummary;
}
