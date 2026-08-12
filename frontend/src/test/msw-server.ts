import { setupServer } from 'msw/node';

// Deliberately created with no handlers. Nothing is mocked by default, and
// setup.ts starts this with `onUnhandledRequest: 'error'`, so a component that
// fires a request no test asked for fails the test naming the URL rather than
// hanging or quietly resolving to undefined.
//
// Tests declare their own network per case:
//
//   server.use(getAuthMeMockHandler({ email: 'reader@example.com' }));
//
// where getAuthMeMockHandler comes from the orval-generated `*.msw.ts` files
// next to each tag's client. setup.ts resets between tests, so a handler
// registered in one case cannot leak into the next.
//
// This lives in its own module rather than in setup.ts because tests need to
// import `server`. Setup files run for their side effects; importing a value
// back out of one works, but this is the honest version.
export const server = setupServer();
