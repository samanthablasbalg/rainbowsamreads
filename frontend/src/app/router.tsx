import { createBrowserRouter } from 'react-router';
import { AuthenticatedShell } from '@/components/layouts/authenticated-shell/authenticated-shell';
import { Challenges } from './routes/challenges';
import { Home } from './routes/home';
import { Insights } from './routes/insights';
import { Landing } from './routes/landing';
import { Library } from './routes/library';
import { NotFound } from './routes/not-found';
import { RouteError } from './routes/route-error';
import { RequireAuth, RequireGuest } from './require-auth';

// Data mode: the tree is a plain array rather than JSX, which is what lets § 3 swap
// `Component` for `lazy` per route and what the auth wrappers in § 2 hang off.
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
        children: [
          { path: '/home', Component: Home },
          { path: '/library', Component: Library },
          { path: '/insights', Component: Insights },
          { path: '/challenges', Component: Challenges },
        ],
      },
    ],
  },
  { path: '*', Component: NotFound },
];

export const router = createBrowserRouter(routes);
