import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  // Passing the function itself rather than calling it makes this a lazy initialiser --
  // React runs it once on mount instead of on every render.
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [systemIsDark, setSystemIsDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  // Track the OS preference regardless of the current setting, so switching back to
  // 'system' is instant rather than waiting for the next OS change.
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemIsDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  // The one place the class is written. `styles.css` keys both the token blocks and
  // Tailwind's `dark:` variant off it.
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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
