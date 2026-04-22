import { describe, expect, it } from 'vitest';
import { monod, liebigMinimum } from '../src/nutrients.js';

describe('Michaelis-Menten / Monod', () => {
  it('matches analytical form S / (K + S)', () => {
    const cases: Array<[number, number]> = [
      [0, 5],
      [1, 5],
      [5, 5],
      [10, 5],
      [50, 5],
      [100, 5],
    ];
    for (const [S, K] of cases) {
      const expected = S / (K + S);
      expect(monod(S, K)).toBeCloseTo(expected, 10);
    }
  });

  it('is 0.5 exactly when S = K', () => {
    expect(monod(7, 7)).toBeCloseTo(0.5, 12);
  });

  it('returns 0 when S ≤ 0', () => {
    expect(monod(0, 5)).toBe(0);
    expect(monod(-1, 5)).toBe(0);
  });

  it('saturates toward 1 as S → ∞', () => {
    expect(monod(1e9, 5)).toBeCloseTo(1, 8);
  });
});

describe('Liebig minimum across {CO2,N,P,K,Fe}', () => {
  const base = {
    co2Mg: 30,
    nMg: 20,
    pMg: 2,
    kMg: 20,
    feMg: 0.5,
    kCO2Mg: 10,
    kN: 2,
    kP: 0.2,
    kK: 5,
    kFe: 0.05,
  };

  it('picks the scarcest nutrient', () => {
    const r = liebigMinimum({ ...base, nMg: 0.01 });
    expect(r.limiting).toBe('N');
    expect(r.multiplier).toBeLessThan(r.factors.co2);
    expect(r.multiplier).toBeLessThan(r.factors.P);
    expect(r.multiplier).toBeLessThan(r.factors.K);
    expect(r.multiplier).toBeLessThan(r.factors.Fe);
  });

  it('picks Fe when Fe is crashed', () => {
    const r = liebigMinimum({ ...base, feMg: 0.001 });
    expect(r.limiting).toBe('Fe');
  });

  it('picks CO2 when CO2 is low relative to its K', () => {
    const r = liebigMinimum({ ...base, co2Mg: 0.5 });
    expect(r.limiting).toBe('co2');
  });

  it('returns the minimum of the factor set', () => {
    const r = liebigMinimum(base);
    const factors = [
      r.factors.co2,
      r.factors.N,
      r.factors.P,
      r.factors.K,
      r.factors.Fe,
    ];
    expect(r.multiplier).toBeCloseTo(Math.min(...factors), 12);
  });
});
