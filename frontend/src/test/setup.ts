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
// THE RULE FOR THIS SECTION: it stays short. If a test needs a polyfill to pass --
// ResizeObserver, pointer capture -- that is the signal to ask whether it is really a
// Vitest test. It is not a given that opening a Base UI menu or sheet needs either:
// account-menu.spec.tsx clicks a dropdown trigger open and clicks through to the
// theme toggle and log out with neither polyfilled, because Base UI's open state
// here is plain JS state, not something driven by layout. What jsdom genuinely can't
// answer honestly is real positioning, viewport overflow, animation timing, and
// hover/drag interactions -- that is what's actually Playwright's. Reach for
// Playwright because a test needs layout, not because it needs a click to go
// somewhere.
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
