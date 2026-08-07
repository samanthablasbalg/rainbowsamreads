import { createBrowserRouter, redirect } from 'react-router';
import { Pending } from '@/components/common/pending';
import { AuthenticatedShell } from '@/components/layouts/authenticated-shell/authenticated-shell';
import { Landing } from './routes/landing';
import { Library } from './routes/library';
import { NotFound } from './routes/not-found';
import { RouteError } from './routes/route-error';
import { RequireAuth, RequireGuest } from './require-auth';

// Data mode: the tree is a plain array rather than JSX, which is what the `lazy`
// entries below and the auth wrappers hang off.
//
// Exported separately from the router instance below so router.spec.tsx can feed it
// to `createMemoryRouter`, which takes an initial URL -- `createBrowserRouter` doesn't.
export const routes = [
  { Component: RequireGuest, children: [{ path: '/', Component: Landing }] },
  {
    // Two ErrorBoundaries, at different scopes. This outer one catches the guard
    // itself, which throws when the session request fails for a reason other than
    // 401 -- there is no shell around it yet, so without this react-router's own
    // unstyled default would take the whole document.
    Component: RequireAuth,
    ErrorBoundary: RouteError,
    children: [
      {
        // A pathless layout route -- it contributes no URL segment, it only wraps its
        // children in shared chrome, so each child below carries its own full path. It
        // renders once and stays mounted while you move between destinations.
        //
        // Its own boundary, so a screen that throws is replaced in place and the nav
        // survives; the outer one would take the shell down with it.
        Component: AuthenticatedShell,
        ErrorBoundary: RouteError,
        // Each screen is its own chunk. `HydrateFallback` sits on the lazy route
        // itself rather than on a parent, and that placement is load-bearing: the
        // router renders the fallback *in place of* the component that declares it
        // and drops everything below. Hoisting these up to the shell or the guard
        // would replace the shell too, so a cold load would paint bare text instead
        // of chrome with a pending content area. It is also not optional -- without
        // one, an initial match on a lazy route renders null and warns.
        //
        // Landing, NotFound and RouteError stay eager on purpose. The error boundary
        // especially: a chunk that cannot be fetched is exactly when it has to render.
        children: [
          {
            path: '/home',
            lazy: async () => ({ Component: (await import('./routes/home')).Home }),
            HydrateFallback: Pending,
          },
          {
            // The one destination that is a section rather than a screen. `Library` is
            // a layout: it renders the shelf nav and an Outlet, so the nav stays put
            // while the four shelves swap beneath it. Eager, unlike its children, for
            // the same reason AuthenticatedShell is -- a HydrateFallback below it can
            // only render inside chrome that is already there.
            //
            // Nesting is what keeps the rail and mobile navs untouched: NavLink's match
            // is prefix-based, so `to="/library"` stays active across all four.
            path: '/library',
            Component: Library,
            children: [
              // /library itself has no screen. Catalog rather than the first shelf: To
              // Read is a stub, so a bookmark to /library would otherwise dead-end.
              { index: true, loader: () => redirect('/library/catalog') },
              {
                path: 'tbr',
                lazy: async () => ({ Component: (await import('./routes/tbr')).ToRead }),
                HydrateFallback: Pending,
              },
              {
                path: 'finished',
                lazy: async () => ({ Component: (await import('./routes/finished')).Finished }),
                HydrateFallback: Pending,
              },
              {
                path: 'dnf',
                lazy: async () => ({ Component: (await import('./routes/dnf')).Dnf }),
                HydrateFallback: Pending,
              },
              {
                path: 'catalog',
                lazy: async () => ({ Component: (await import('./routes/catalog')).Catalog }),
                HydrateFallback: Pending,
              },
            ],
          },
          {
            path: '/insights',
            lazy: async () => ({ Component: (await import('./routes/insights')).Insights }),
            HydrateFallback: Pending,
          },
          {
            path: '/challenges',
            lazy: async () => ({ Component: (await import('./routes/challenges')).Challenges }),
            HydrateFallback: Pending,
          },
        ],
      },
    ],
  },
  { path: '*', Component: NotFound },
];

export const router = createBrowserRouter(routes);
