/**
 * Ink-green palette expressed as hex ints for three.js `Color` constructors.
 * Mirrors `skills/ink-green-design-system` — do not introduce colors outside this set.
 * Saturation stays low; any new value must justify itself against the design system.
 */

export const palette = {
  ink: {
    900: 0x0a1f18,
    800: 0x0f2a20,
    700: 0x163b2d,
    600: 0x1e4c3b,
  },
  moss: {
    500: 0x2f6e55,
    400: 0x4e8c72,
    300: 0x6fae8e,
    200: 0xa7cfba,
    100: 0xd7e9df,
  },
  bone: {
    100: 0xede7d9,
    200: 0xdcd5c6,
    300: 0xcfc7b4,
  },
  stone: {
    700: 0x3f4a44,
    500: 0x6f7a6e,
    300: 0x97a09a,
  },
} as const;

/** Scene-level fog + background: app background ink-900. */
export const SCENE_BACKGROUND = palette.ink[900];
/** Glass tint — a touch lighter than ink-800 so silhouettes read. */
export const GLASS_TINT = palette.ink[700];
/** Water body base color — ink-800 pushed toward moss-500 at depth. */
export const WATER_BASE = palette.ink[800];
export const WATER_DEEP = palette.moss[500];
/** Substrate — stone-700 (dividers on dark) grading slightly warmer where wet. */
export const SUBSTRATE_DRY = palette.stone[700];
export const SUBSTRATE_WET = palette.ink[700];
/** Hardscape rock — ink-700 with stone speckle. */
export const ROCK_BASE = palette.ink[700];
export const ROCK_HIGHLIGHT = palette.stone[500];
/** Plant stem + leaf. Strictly moss-family. */
export const LEAF_BASE = palette.moss[500];
export const LEAF_TIP = palette.moss[300];
export const STEM_COLOR = palette.moss[400];
/** Foreground accent — used sparingly for future UI overlays over the canvas. */
export const FOREGROUND = palette.bone[100];
