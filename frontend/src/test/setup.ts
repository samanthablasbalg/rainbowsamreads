import '@testing-library/jest-dom/vitest';
import { server } from './msw-server';

// jsdom has no matchMedia, and theme-provider.tsx calls it during mount, so without this
// anything inside AppProvider throws before the first assertion. The stub always reports
// light -- a test that cares about dark mode calls setTheme('dark').
//
// This section stays short. A test that needs a polyfill to pass -- ResizeObserver,
// pointer capture -- is the signal to ask whether it belongs in Vitest at all. Opening a
// Base UI menu or sheet doesn't need either; its open state is plain JS. What jsdom
// cannot answer honestly is positioning, viewport overflow, animation timing and
// hover/drag, and that is Playwright's. Reach for Playwright when a test needs layout,
// not when it needs a click to go somewhere.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    // Deprecated, but still on the interface, so they have to be here to satisfy it.
    addListener: () => {},
    removeListener: () => {},
  }),
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
