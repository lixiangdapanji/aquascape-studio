/**
 * Composes the light / CO2 / nutrient / temperature responses into a single
 * per-tick net specific growth rate g(t, state):
 *
 *   dB/dt = g · B,   g = Pmax · f_light · f_CO2 · f_N · f_P · f_K · f_Fe · f_T − r
 *
 * Because f_CO2 and the macros are all Monod factors, we combine them with
 * Liebig's minimum to obtain a single f_nutr. Light is applied multiplicatively
 * because the P-I curve already integrates the photon availability. T is also
 * multiplicative — below/above optimum scales everything else.
 *
 * This function is pure: no time advance, no state mutation. The integrator
 * calls it as the RHS of an ODE.
 */

import type { LimitingFactor, Species, Water } from './types.js';
import { lightLimitation } from './photosynthesis.js';
import { liebigMinimum } from './nutrients.js';
import { temperatureResponse } from './temperature.js';

export interface GrowthRateBreakdown {
  readonly gPerDay: number;
  readonly grossPerDay: number;
  readonly fLight: number;
  readonly fNutr: number;
  readonly fTemp: number;
  readonly limiting: LimitingFactor;
}

export function computeGrowthRate(
  species: Species,
  water: Water,
  parUmolM2S: number,
): GrowthRateBreakdown {
  const fLight = lightLimitation(parUmolM2S, species.pMaxPerDay, species.alphaPerPAR);
  const fTemp = temperatureResponse(water.temperatureC, {
    tOptC: species.tOptC,
    tSigmaLowC: species.tSigmaLowC,
    tSigmaHighC: species.tSigmaHighC,
    q10Below: species.q10Below,
  });
  const nutr = liebigMinimum({
    co2Mg: water.co2Mg,
    nMg: water.nMg,
    pMg: water.pMg,
    kMg: water.kMg,
    feMg: water.feMg,
    kCO2Mg: species.kCO2Mg,
    kN: species.kN,
    kP: species.kP,
    kK: species.kK,
    kFe: species.kFe,
  });

  const grossPerDay =
    species.pMaxPerDay * fLight * nutr.multiplier * fTemp;

  // Determine the true limiter across all axes (light / temp / nutrient).
  let limiting: LimitingFactor = nutr.limiting;
  let minF = nutr.multiplier;
  if (fLight < minF) {
    minF = fLight;
    limiting = 'light';
  }
  if (fTemp < minF) {
    minF = fTemp;
    limiting = 'temp';
  }

  // r · B is subtracted *outside* the gross term; report both.
  const gPerDay = grossPerDay - species.respirationPerDay;

  return {
    gPerDay,
    grossPerDay,
    fLight,
    fNutr: nutr.multiplier,
    fTemp,
    limiting,
  };
}
