/**
 * Tailwind theme extension, derived from the ink-green tokens.
 *
 * Tailwind 4's new `@theme` syntax is used at the CSS layer (see
 * apps/web/app/globals.css). We still export the preset object in case we need
 * a JS config for tooling that expects one (Storybook, tests, etc.).
 */

import { color, fontFamily, fontSize, lineHeight, motion, radius, spacing } from './tokens.js';

export const tailwindTheme = {
  colors: {
    transparent: 'transparent',
    current: 'currentColor',
    ink: {
      900: color.ink[900],
      800: color.ink[800],
      700: color.ink[700],
    },
    moss: {
      500: color.moss[500],
      300: color.moss[300],
    },
    bone: {
      100: color.bone[100],
      300: color.bone[300],
    },
    stone: {
      500: color.stone[500],
    },
    background: color.semantic.background,
    surface: color.semantic.surface,
    'surface-hover': color.semantic.surfaceHover,
    primary: color.semantic.primary,
    accent: color.semantic.accent,
    foreground: color.semantic.foreground,
    'muted-foreground': color.semantic.mutedForeground,
    border: color.semantic.border,
    'focus-ring': color.semantic.focusRing,
  },
  spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, `${v}px`])),
  borderRadius: {
    none: '0',
    sm: `${radius.sm}px`,
    md: `${radius.md}px`,
    lg: `${radius.lg}px`,
    full: '9999px',
  },
  fontFamily: {
    sans: fontFamily.sans,
    serif: fontFamily.serif,
    mono: fontFamily.mono,
  },
  fontSize: Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, `${v}px`])),
  lineHeight: {
    tight: String(lineHeight.tight),
    snug: String(lineHeight.snug),
    body: String(lineHeight.body),
    'body-mobile': String(lineHeight.bodyMobile),
    loose: String(lineHeight.loose),
  },
  transitionDuration: {
    hover: `${motion.duration.hover}ms`,
    transition: `${motion.duration.transition}ms`,
  },
  transitionTimingFunction: {
    out: motion.easing.out,
    transition: motion.easing.transition,
  },
};
