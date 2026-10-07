import '@testing-library/jest-dom/vitest';
import { server } from './msw-server';
import { configure } from '@testing-library/react';

const unhandledRequests: string[] = [];
const consoleMessages: string[] = [];

function recordConsoleCall(method: 'error' | 'warn') {
  return (...messages: unknown[]) => {
    consoleMessages.push(`console.${method}: ${messages.map(String).join(' ')}`);
  };
}

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

window.scrollTo = vi.fn();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  server.events.on('request:unhandled', ({ request }) => {
    unhandledRequests.push(`${request.method} ${request.url}`);
  });
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(recordConsoleCall('error'));
  vi.spyOn(console, 'warn').mockImplementation(recordConsoleCall('warn'));
});

afterEach(() => {
  server.resetHandlers();

  const requests = unhandledRequests.splice(0);
  const messages = consoleMessages.splice(0);
  const failures = [
    ...(requests.length > 0
      ? [`Unhandled MSW request${requests.length === 1 ? '' : 's'}:\n${requests.join('\n')}`]
      : []),
    ...(messages.length > 0 ? [`Unexpected console output:\n${messages.join('\n')}`] : []),
  ];

  if (failures.length > 0) {
    throw new Error(failures.join('\n\n'));
  }
});

afterAll(() => {
  server.close();
});

configure({
  getElementError: (message) => {
    const error = new Error(message ?? 'Element not found');
    error.name = 'TestingLibraryElementError';
    return error;
  },
});
