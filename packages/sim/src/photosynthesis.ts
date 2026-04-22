/**
 * Light-limited photosynthesis.
 *
 * Webb/Platt exponential saturation (Platt, Gallegos & Harrison, 1980):
 *
 *   P(I) = Pmax · (1 − exp(−α · I / Pmax))
 *
 * Intuition:
 *   - At I → 0: P ≈ α · I  (slope = α, the quantum-yield-like coefficient).
 *   - At I → ∞: P → Pmax   (light saturation).
 *   - P is C0-continuous and monotonically non-decreasing in I.
 *
 * Units:
 *   I    — PAR, µmol photons · m⁻² · s⁻¹
 *   Pmax — max specific growth rate (1/day)
 *   α    — initial slope (1/day per µmol·m⁻²·s⁻¹)
 *   P    — specific growth rate (1/day)
 */
export function photosynthesisPI(
  parUmolM2S: number,
  pMaxPerDay: number,
  alphaPerPAR: number,
): number {
  if (parUmolM2S <= 0) return 0;
  if (pMaxPerDay <= 0) return 0;
  if (alphaPerPAR <= 0) return 0;
  const exponent = -(alphaPerPAR * parUmolM2S) / pMaxPerDay;
  return pMaxPerDay * (1 - Math.exp(exponent));
}

/**
 * Returns the P-I response normalised to Pmax (range [0,1)).
 * Useful for composing with other limitation terms.
 */
export function lightLimitation(
  parUmolM2S: number,
  pMaxPerDay: number,
  alphaPerPAR: number,
): number {
  if (pMaxPerDay <= 0) return 0;
  return photosynthesisPI(parUmolM2S, pMaxPerDay, alphaPerPAR) / pMaxPerDay;
}
