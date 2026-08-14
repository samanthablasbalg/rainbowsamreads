import { useEffect, type ReactNode } from 'react';

const realMatchMedia = window.matchMedia;

export function withPointer(coarse: boolean) {
  return function PointerDecorator(Story: () => ReactNode) {
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
