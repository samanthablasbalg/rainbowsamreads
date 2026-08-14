import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ThemeContext, type Theme } from './theme-context';

// Shared with the inline script in index.html, which applies the class before the
// first paint. If this changes, change it there too.
const STORAGE_KEY = 'reading-tracker-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Storage can throw in private browsing. Falling through to 'system' is correct.
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const systemIsDark = useMediaQuery(DARK_QUERY);

  const resolvedTheme = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable; the choice still applies for this session.
    }
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
