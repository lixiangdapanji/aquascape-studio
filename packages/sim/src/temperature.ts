/**
 * Temperature response — an asymmetric bell around the species optimum.
 *
 * Construction (Phase 1 v0):
 *
 *   Below optimum:   fT = Q10^((T - Topt)/10)
 *                    (smoothly approaches 1 at Topt; Q10 ≈ 2 is canonical).
 *   Above optimum:   fT = exp(−((T - Topt) / σ_high)^2 / 2)
 *                    (gaussian falloff; denatures quickly — σ_high small).
 *
 * The two halves are stitched at Topt where both evaluate to 1, so the
 * response is C0 continuous and clamped to [0, 1].
 *
 * Why asymmetric? Real plants tolerate cold much better than heat; above
 * the optimum, photorespiration balloons and Rubisco specificity collapses,
 * so fitness crashes faster than it rose. The Q10/Gaussian split is the
 * simplest closed form that reproduces this without a full Arrhenius pair.
 *
 * σ_low is exposed for completeness but is only used if someone prefers a
 * Gaussian lower tail (`useGaussianLowTail` flag) — default path uses Q10.
 */

export interface TempParams {
  readonly tOptC: number;
  readonly tSigmaLowC: number;
  readonly tSigmaHighC: number;
  readonly q10Below: number;
}

export function temperatureResponse(
  temperatureC: number,
  p: TempParams,
  useGaussianLowTail = false,
): number {
  const dT = temperatureC - p.tOptC;
  if (dT >= 0) {
    if (p.tSigmaHighC <= 0) return dT === 0 ? 1 : 0;
    const z = dT / p.tSigmaHighC;
    return Math.exp(-0.5 * z * z);
  }
  if (useGaussianLowTail) {
    if (p.tSigmaLowC <= 0) return 0;
    const z = dT / p.tSigmaLowC;
    return Math.exp(-0.5 * z * z);
  }
  if (p.q10Below <= 0) return 0;
  return Math.pow(p.q10Below, dT / 10);
}
