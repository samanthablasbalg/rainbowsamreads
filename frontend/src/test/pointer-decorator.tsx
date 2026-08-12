import { useEffect, type ReactNode } from 'react';

// Captured at import time, before any story has swapped it, so cleanup always restores
// the browser's real implementation rather than another story's stub.
const realMatchMedia = window.matchMedia;

// Components that split dialog-vs-drawer read the pointer through `useIsCoarsePointer`.
// Storybook runs under whatever pointer the host machine has -- in CI and on a laptop,
// always fine -- so the coarse branch is unreachable without forcing the query. A vitest
// spec would reach for `vi.stubGlobal`, which browser stories lack.
export function withPointer(coarse: boolean) {
  return function PointerDecorator(Story: () => ReactNode) {
    // Deliberately assigned during render, not in an effect. The component under test
    // reads `matchMedia` while rendering, which happens before any effect runs, so an
    // effect would install the stub too late. The assignment is idempotent, so a
    // double render is harmless.
    window.matchMedia = ((query: string) =>
      ({
        media: query,
        matches: coarse,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        addListener: () => {},
        removeListener: () => {},
      }) as MediaQueryList) as typeof window.matchMedia;

    useEffect(() => () => void (window.matchMedia = realMatchMedia), []);

    return <Story />;
  };
}
