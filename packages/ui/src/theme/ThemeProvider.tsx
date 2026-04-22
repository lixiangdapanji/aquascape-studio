/**
 * ThemeProvider — a single React context that carries ink-green tokens.
 *
 * Works on both React DOM and React Native. Platform-specific consumers
 * (<Button>, <Card>, etc.) read from useTheme() and apply styles via whichever
 * primitive is available in their runtime.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { tokens, type Tokens } from './tokens.js';

export type Theme = Tokens;

const ThemeContext = createContext<Theme>(tokens);

export function ThemeProvider({
  value,
  children,
}: {
  value?: Theme;
  children: ReactNode;
}): JSX.Element {
  const memo = useMemo(() => value ?? tokens, [value]);
  return <ThemeContext.Provider value={memo}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
