/**
 * Hand-coded species fixtures for v0 tests. These will be replaced by
 * `@aquascape/data/plants.json` (botany-agent, Phase 1 parallel work).
 *
 * Values are order-of-magnitude defensible; they are *not* calibrated from
 * empirical data. Where a range is known from the hobbyist literature,
 * we pick the middle of the range and document rationale inline.
 */

import type { Species } from '../../src/types.js';

/**
 * Rotala rotundifolia — classic mid-ground stem plant. Tolerant, fast-growing
 * under medium-to-high light with CO2. "Easy" in hobbyist parlance.
 *
 * Target calibration point: under favourable conditions it extends
 * approximately 0.5 cm/day. That requires Pmax · (all favourable factors)
 *   − r ≈ ln(L_final/L_initial) / 30 days
 * For a stem going from ~15 cm to ~30 cm (doubling) in 30 days: g ≈ 0.023/day.
 * We pick pMax = 0.30/day so that after all the saturation factors (~0.4)
 * the net is in the right ballpark while preserving headroom.
 */
export const ROTALA_ROTUNDIFOLIA: Species = {
  id: 'rotala-rotundifolia',
  commonName: 'Rotala rotundifolia',
  pMaxPerDay: 0.35,
  alphaPerPAR: 0.006, // saturates around ~150 µmol/m²/s
  kCO2Mg: 10, // CO2 half-sat ≈ 10 mg/L; 30 mg/L is "high tech"
  kN: 2,
  kP: 0.2,
  kK: 5,
  kFe: 0.05,
  tOptC: 25,
  tSigmaLowC: 5,
  tSigmaHighC: 3,
  q10Below: 2,
  respirationPerDay: 0.05,
  massToLengthCm: 30, // 1 g wet stem ≈ 30 cm for a thin-stemmed species
};

/**
 * Anubias barteri var. nana — slow rhizome plant, shade-tolerant. Used as
 * a contrast species: low Pmax, low α, forgiving of low CO2 and low light.
 */
export const ANUBIAS_NANA: Species = {
  id: 'anubias-barteri-nana',
  commonName: 'Anubias barteri var. nana',
  pMaxPerDay: 0.04,
  alphaPerPAR: 0.003,
  kCO2Mg: 3,
  kN: 0.5,
  kP: 0.05,
  kK: 1,
  kFe: 0.02,
  tOptC: 25,
  tSigmaLowC: 6,
  tSigmaHighC: 4,
  q10Below: 2,
  respirationPerDay: 0.015,
  massToLengthCm: 5,
};

/**
 * Hemianthus callitrichoides "Cuba" — demanding carpet. High light + high
 * CO2 required. Crashes without CO2.
 */
export const HC_CUBA: Species = {
  id: 'hemianthus-callitrichoides-cuba',
  commonName: 'Hemianthus callitrichoides "Cuba"',
  pMaxPerDay: 0.35,
  alphaPerPAR: 0.004,
  kCO2Mg: 18, // strongly CO2-limited at typical levels
  kN: 2,
  kP: 0.3,
  kK: 5,
  kFe: 0.06,
  tOptC: 24,
  tSigmaLowC: 4,
  tSigmaHighC: 2.5,
  q10Below: 2,
  respirationPerDay: 0.06,
  massToLengthCm: 8,
};

export const ALL_SPECIES = [ROTALA_ROTUNDIFOLIA, ANUBIAS_NANA, HC_CUBA] as const;
