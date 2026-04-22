/**
 * Nutrient limitation.
 *
 * Each nutrient contributes a Michaelis-Menten / Monod factor:
 *
 *   f_i(S_i) = S_i / (K_i + S_i) ∈ [0, 1)
 *
 * CO2 is handled identically but lives on `water.co2Mg` rather than the macro
 * set {N, P, K, Fe}. The overall nutrient multiplier is the Liebig minimum:
 *
 *   f_nutr = min_i f_i
 *
 * Rationale: Liebig's law of the minimum is a first-order approximation that
 * captures the qualitative behaviour aquascapers observe — doubling nitrate
 * doesn't help when K is the one that's crashed — without adding the full
 * Mankin-Epstein multiplicative interaction surface. Phase 2 replaces this
 * with a smoothed soft-min to remove the C1 kink for gradient-based users.
 */

import type { LimitingFactor } from './types.js';

export function monod(concMg: number, kMg: number): number {
  if (concMg <= 0) return 0;
  if (kMg <= 0) return 1; // degenerate: nutrient needs vanish
  return concMg / (kMg + concMg);
}

export interface NutrientInputs {
  readonly co2Mg: number;
  readonly nMg: number;
  readonly pMg: number;
  readonly kMg: number;
  readonly feMg: number;
  readonly kCO2Mg: number;
  readonly kN: number;
  readonly kP: number;
  readonly kK: number;
  readonly kFe: number;
}

export interface LiebigResult {
  readonly multiplier: number;
  readonly limiting: LimitingFactor;
  readonly factors: {
    readonly co2: number;
    readonly N: number;
    readonly P: number;
    readonly K: number;
    readonly Fe: number;
  };
}

/**
 * Compute per-nutrient Monod factors and the Liebig minimum across
 * {CO2, N, P, K, Fe}. Ties break in the order listed.
 */
export function liebigMinimum(inp: NutrientInputs): LiebigResult {
  const factors = {
    co2: monod(inp.co2Mg, inp.kCO2Mg),
    N: monod(inp.nMg, inp.kN),
    P: monod(inp.pMg, inp.kP),
    K: monod(inp.kMg, inp.kK),
    Fe: monod(inp.feMg, inp.kFe),
  } as const;

  let limiting: LimitingFactor = 'co2';
  let min = factors.co2;
  if (factors.N < min) {
    min = factors.N;
    limiting = 'N';
  }
  if (factors.P < min) {
    min = factors.P;
    limiting = 'P';
  }
  if (factors.K < min) {
    min = factors.K;
    limiting = 'K';
  }
  if (factors.Fe < min) {
    min = factors.Fe;
    limiting = 'Fe';
  }
  return { multiplier: min, limiting, factors };
}
