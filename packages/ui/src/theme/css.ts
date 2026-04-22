/**
 * CSS custom properties generated from the ink-green tokens.
 *
 * Emitted as a string so it can be dropped into a `<style>` tag in the Next.js
 * root layout or pulled into Tailwind's preflight via the `@theme` directive
 * (Tailwind 4).
 */

import { color, motion, radius, spacing } from './tokens.js';

const vars: Record<string, string> = {
  // palette
  '--color-ink-900': color.ink[900],
  '--color-ink-800': color.ink[800],
  '--color-ink-700': color.ink[700],
  '--color-moss-500': color.moss[500],
  '--color-moss-300': color.moss[300],
  '--color-bone-100': color.bone[100],
  '--color-bone-300': color.bone[300],
  '--color-stone-500': color.stone[500],

  // semantic
  '--color-background': color.semantic.background,
  '--color-surface': color.semantic.surface,
  '--color-surface-hover': color.semantic.surfaceHover,
  '--color-primary': color.semantic.primary,
  '--color-accent': color.semantic.accent,
  '--color-foreground': color.semantic.foreground,
  '--color-muted-foreground': color.semantic.mutedForeground,
  '--color-border': color.semantic.border,
  '--color-focus-ring': color.semantic.focusRing,

  // radius
  '--radius-sm': `${radius.sm}px`,
  '--radius-md': `${radius.md}px`,
  '--radius-lg': `${radius.lg}px`,

  // spacing — expose the common rungs; Tailwind provides the rest.
  '--space-1': `${spacing[1]}px`,
  '--space-2': `${spacing[2]}px`,
  '--space-3': `${spacing[3]}px`,
  '--space-4': `${spacing[4]}px`,
  '--space-5': `${spacing[5]}px`,
  '--space-6': `${spacing[6]}px`,
  '--space-8': `${spacing[8]}px`,

  // motion
  '--duration-hover': `${motion.duration.hover}ms`,
  '--duration-transition': `${motion.duration.transition}ms`,
  '--ease-out': motion.easing.out,
  '--ease-transition': motion.easing.transition,
};

export function cssVariablesBlock(): string {
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

export const cssVariables = vars;
