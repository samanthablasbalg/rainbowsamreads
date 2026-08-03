import { createBrowserRouter } from 'react-router';
import { AuthenticatedShell } from '@/components/layouts/authenticated-shell/authenticated-shell';
import { Challenges } from './routes/challenges';
import { Home } from './routes/home';
import { Insights } from './routes/insights';
import { Landing } from './routes/landing';
import { Library } from './routes/library';
import { NotFound } from './routes/not-found';

// Data mode: the tree is a plain array rather than JSX, which is what lets § 3 swap
// `Component` for `lazy` per route and what the auth wrappers in § 2 hang off.
export const router = createBrowserRouter([
  { path: '/', Component: Landing },
  {
    // A pathless layout route -- it contributes no URL segment, it only wraps its
    // children in shared chrome, so each child below carries its own full path. It
    // renders once and stays mounted while you move between destinations.
    Component: AuthenticatedShell,
    children: [
      { path: '/home', Component: Home },
      { path: '/library', Component: Library },
      { path: '/insights', Component: Insights },
      { path: '/challenges', Component: Challenges },
    ],
  },
  { path: '*', Component: NotFound },
]);
