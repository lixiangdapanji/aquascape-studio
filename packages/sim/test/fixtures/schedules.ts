import type { LightSchedule } from '../../src/types.js';

/**
 * 8-hour photoperiod centered ~14:00, peaking at 150 µmol·m⁻²·s⁻¹.
 * A typical planted-tank "high-ish medium" intensity.
 */
export const MEDIUM_8H: LightSchedule = {
  hourlyPAR: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,        // 0-9h: off
    50, 120, 150, 150, 150, 150, 120, 50, // 10-17h: on (with ramp)
    0, 0, 0, 0, 0, 0,                    // 18-23h: off
  ],
};

/**
 * Constant 150 µmol·m⁻²·s⁻¹ for 24h — unphysical but useful for
 * closed-form validation of steady-state growth rates in tests.
 */
export const CONSTANT_150: LightSchedule = {
  hourlyPAR: Array.from({ length: 24 }, () => 150),
};

/**
 * Constant darkness.
 */
export const DARK: LightSchedule = {
  hourlyPAR: Array.from({ length: 24 }, () => 0),
};
