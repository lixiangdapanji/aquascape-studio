import { describe, expect, it } from 'vitest';
import { temperatureResponse } from '../src/temperature.js';

const P = {
  tOptC: 25,
  tSigmaLowC: 5,
  tSigmaHighC: 3,
  q10Below: 2,
};

describe('Temperature bell curve', () => {
  it('peaks at 1.0 at T = Topt', () => {
    expect(temperatureResponse(25, P)).toBeCloseTo(1, 12);
  });

  it('is the global maximum at Topt', () => {
    const peak = temperatureResponse(P.tOptC, P);
    for (const dT of [-10, -5, -1, 1, 3, 5, 10]) {
      const f = temperatureResponse(P.tOptC + dT, P);
      expect(f).toBeLessThanOrEqual(peak + 1e-12);
    }
  });

  it('Q10 = 2 → halving every 10 °C below optimum', () => {
    const fAtOptMinus10 = temperatureResponse(25 - 10, P);
    expect(fAtOptMinus10).toBeCloseTo(0.5, 6);
    const fAtOptMinus20 = temperatureResponse(25 - 20, P);
    expect(fAtOptMinus20).toBeCloseTo(0.25, 6);
  });

  it('falls off rapidly above optimum (smaller σ_high)', () => {
    const below = temperatureResponse(25 - 3, P); // Q10 branch
    const above = temperatureResponse(25 + 3, P); // Gaussian branch, 1σ
    // Above-optimum decay should dominate the same-distance below-optimum decay.
    expect(above).toBeLessThan(below);
  });

  it('approaches 0 far above optimum', () => {
    expect(temperatureResponse(25 + 20, P)).toBeLessThan(1e-6);
  });

  it('is monotonically non-decreasing up to Topt', () => {
    let prev = -Infinity;
    for (let T = 5; T <= 25; T += 1) {
      const f = temperatureResponse(T, P);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = f;
    }
  });

  it('is monotonically non-increasing past Topt', () => {
    let prev = Infinity;
    for (let T = 25; T <= 45; T += 1) {
      const f = temperatureResponse(T, P);
      expect(f).toBeLessThanOrEqual(prev + 1e-12);
      prev = f;
    }
  });
});
