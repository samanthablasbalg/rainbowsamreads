// Runs once before every test file. Registered as `setupFiles` in vite.config.ts.

// Adds the DOM matchers -- toBeInTheDocument, toHaveClass, toBeDisabled and the rest --
// to `expect`. The `/vitest` entry point rather than the bare package: it is the one
// that also registers the TypeScript augmentation, so the matchers typecheck.
import '@testing-library/jest-dom/vitest';
import { server } from './msw-server';

// There is no `afterEach(cleanup)` here on purpose. Testing Library registers its own
// as soon as it sees a global `afterEach`, which `globals: true` provides -- so
// components are unmounted between tests already. Adding a second one would work but
// would imply it was needed.

// jsdom does not implement matchMedia at all, and theme-provider.tsx calls it in a lazy
// useState initialiser -- so without this, rendering anything inside AppProvider throws
// before the first assertion.
//
// The stub always reports light mode and its listeners do nothing. That is deliberate:
// a test that cares about dark mode should call setTheme('dark') and assert on the
// result, not pretend the operating system changed underneath it.
//
// THE RULE FOR THIS SECTION: it stays short. Base UI (dropdown-menu, sheet) also wants
// ResizeObserver and pointer capture, and they are not here because nothing needs them
// yet. When a test does, that is the signal to ask whether it is really a Vitest test
// -- "the menu opens when I tap it" is a Playwright test, and jsdom has no layout
// engine to answer it honestly anyway. Reach for Playwright before reaching for a
// polyfill.
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
  // Anything not explicitly mocked is a test failure, not a warning. The alternative
  // is a test that passes because the request never resolved and the assertion
  // happened to match a loading state.
  server.listen({ onUnhandledRequest: 'error' });
});

// Drops handlers added by a single test via server.use(), so each test starts from the
// same empty server.
afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
