import { Navigate, Outlet } from 'react-router';
import { Pending } from '@/components/common/pending';
import { useAuth } from '@/lib/auth';

// Pathless route components: each renders `<Outlet />` for the branch it guards, or a
// redirect in its place.
//
// Being mounted components rather than route loaders is the point. A loader runs once
// per navigation, so it only ever answers "were you signed in when you moved?". These
// stay subscribed to the session query, so when it refetches on window focus and comes
// back 401, the redirect happens with no navigation involved.
//
// `replace` on both: the URL that bounced you should not be sitting in history waiting
// for the back button to bounce you again.

export function RequireAuth() {
  const { isPending, isUnauthorized, error } = useAuth();

  // Waiting, not signed out, while the session is in flight -- folding "no answer yet"
  // into "signed out" would redirect every hard refresh of an authenticated URL before
  // the request lands. The same Pending the lazy routes below use, so a cold load is
  // one continuous wait rather than a blank that turns into a different wait.
  if (isPending) return <Pending />;
  if (isUnauthorized) return <Navigate to="/" replace />;
  // A 500 or a dead network is not a signed-out reader. Sending those to the landing
  // page would show a sign-in button for a problem signing in cannot fix, so they go to
  // the ErrorBoundary on this route instead.
  if (error) throw error;

  return <Outlet />;
}

export function RequireGuest() {
  const { isPending, isAuthenticated } = useAuth();

  // No `error` branch, unlike above: the landing page is public, so a session that
  // failed to load for any reason lands somewhere it is allowed to be.
  if (isPending) return <Pending />;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return <Outlet />;
}
