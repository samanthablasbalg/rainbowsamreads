import { useEffect, useState } from 'react';

// Lazy initialiser: `window.matchMedia` runs once, on mount, rather than on every
// render. The effect below is what keeps `matches` current after that -- the OS or
// the browser window can change which side of the query the device is on at any time.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', onChange);
    return () => mediaQueryList.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
