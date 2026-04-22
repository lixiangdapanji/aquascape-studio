import { describe, expect, it } from 'vitest';
import { photosynthesisPI, lightLimitation } from '../src/photosynthesis.js';

describe('P-I curve (Webb/Platt)', () => {
  const Pmax = 0.3;
  const alpha = 0.006;

  it('returns 0 at I=0', () => {
    expect(photosynthesisPI(0, Pmax, alpha)).toBe(0);
  });

  it('has initial slope ≈ α at small I', () => {
    const I = 1e-3;
    const P = photosynthesisPI(I, Pmax, alpha);
    // dP/dI |_{I=0} = α
    expect(P / I).toBeCloseTo(alpha, 4);
  });

  it('saturates at Pmax as I → ∞', () => {
    expect(photosynthesisPI(1e6, Pmax, alpha)).toBeCloseTo(Pmax, 6);
  });

  it('is monotonically non-decreasing', () => {
    let prev = -Infinity;
    for (const I of [0, 10, 50, 100, 150, 200, 500, 1000, 5000]) {
      const P = photosynthesisPI(I, Pmax, alpha);
      expect(P).toBeGreaterThanOrEqual(prev);
      prev = P;
    }
  });

  it('reaches ~63% of Pmax at I = Pmax/α (characteristic e-fold point)', () => {
    // P(I=Pmax/α) = Pmax·(1 − e^{-1}) ≈ 0.632·Pmax
    const I = Pmax / alpha;
    const P = photosynthesisPI(I, Pmax, alpha);
    expect(P / Pmax).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  it('normalised limitation stays in [0,1)', () => {
    for (const I of [0, 50, 150, 1000, 10000]) {
      const f = lightLimitation(I, Pmax, alpha);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('returns 0 for non-positive Pmax or α (defensive)', () => {
    expect(photosynthesisPI(100, 0, alpha)).toBe(0);
    expect(photosynthesisPI(100, Pmax, 0)).toBe(0);
    expect(photosynthesisPI(100, -1, alpha)).toBe(0);
  });
});
