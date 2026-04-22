/**
 * Ink-green design system tokens — authoritative.
 *
 * Mirrors the `aquascape-studio:ink-green-design-system` skill. Any change here
 * must be reflected in that skill, and vice versa.
 *
 * Consumed by:
 *   - Tailwind theme extension (web)          — packages/ui/src/theme/tailwind.ts
 *   - CSS custom properties (web)             — packages/ui/src/theme/css.ts
 *   - React Native ThemeProvider (mobile)     — packages/ui/src/theme/ThemeProvider.tsx
 */

export const color = {
  ink: {
    900: '#0A1F18', // app background
    800: '#0F2A20', // card / panel
    700: '#163B2D', // hover / pressed panel
  },
  moss: {
    500: '#2F6E55', // primary action
    300: '#6FAE8E', // accent
  },
  bone: {
    100: '#EDE7D9', // foreground text
    300: '#CFC7B4', // muted text
  },
  stone: {
    500: '#6F7A6E', // borders / dividers
  },
  // Semantic roles — what UI code should reach for first.
  semantic: {
    background: '#0A1F18',
    surface: '#0F2A20',
    surfaceHover: '#163B2D',
    primary: '#2F6E55',
    accent: '#6FAE8E',
    foreground: '#EDE7D9',
    mutedForeground: '#CFC7B4',
    border: '#6F7A6E',
    focusRing: '#6FAE8E',
  },
} as const;

/** 8-px baseline grid. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
  9: 64,
  10: 80,
  11: 96,
  12: 128,
} as const;

/** Radius — 4 / 8 / 16 only. No 12, no 20. */
export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;

export const fontFamily = {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
  serif: ['"IBM Plex Serif"', '"Noto Serif SC"', 'Georgia', 'serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
  '5xl': 64,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  body: 1.55, // desktop default
  bodyMobile: 1.5, // mobile default
  loose: 1.75,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const letterSpacing = {
  tight: '-0.015em',
  normal: '0',
  wide: '0.02em',
} as const;

/** Motion — 160 ms ease-out hover, 240 ms custom bezier transitions. */
export const motion = {
  duration: {
    hover: 160,
    transition: 240,
    slow: 400,
  },
  easing: {
    out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    transition: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
} as const;

export const shadow = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.25)',
  md: '0 4px 16px rgba(0, 0, 0, 0.35)',
  lg: '0 16px 48px rgba(0, 0, 0, 0.45)',
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  overlay: 100,
  modal: 1000,
  toast: 2000,
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Tokens = {
  color: typeof color;
  spacing: typeof spacing;
  radius: typeof radius;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  lineHeight: typeof lineHeight;
  fontWeight: typeof fontWeight;
  letterSpacing: typeof letterSpacing;
  motion: typeof motion;
  shadow: typeof shadow;
  zIndex: typeof zIndex;
  breakpoints: typeof breakpoints;
};

export const tokens: Tokens = {
  color,
  spacing,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
  motion,
  shadow,
  zIndex,
  breakpoints,
};

export default tokens;
