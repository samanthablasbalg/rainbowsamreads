import { createContext, useContext } from 'react';

// 'system' is a real, re-selectable choice rather than just the initial default:
// while it is set, the app follows the OS if that flips underneath us.
export type Theme = 'light' | 'dark' | 'system';

export type ThemeContextValue = {
  // What the user chose -- may be 'system'. This is what a settings UI shows as selected.
  theme: Theme;
  // What is actually on screen right now, with 'system' already resolved. This is what
  // an icon swap ("show a moon or a sun") needs.
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be called inside a ThemeProvider');
  }
  return context;
}
