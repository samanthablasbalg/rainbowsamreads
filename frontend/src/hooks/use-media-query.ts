import { useCallback, useSyncExternalStore } from 'react';

// `useSyncExternalStore` is React's hook for reading state that lives outside React --
// here, the browser's answer to a media query. It re-reads the snapshot on every render
// and whenever `subscribe` reports a change, so there is no mirrored `useState` to fall
// out of date when `query` changes.
export function useMediaQuery(query: string): boolean {
  // Identity matters: React resubscribes whenever this function changes, so it is
  // memoised on `query` rather than recreated each render.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onStoreChange);
      return () => mediaQueryList.removeEventListener('change', onStoreChange);
    },
    [query]
  );

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
