import { useQueryClient } from '@tanstack/react-query';
import { useAuthLogout, useAuthMe } from '@/api/generated/auth/auth';

// A full-page redirect: the OAuth flow leaves the app and returns through the
// backend's callback, so there is no response to wait for here.
export function login() {
  window.location.href = '/api/auth/login';
}

export function useAuth() {
  const queryClient = useQueryClient();

  // The cached session query is the state. Nothing is copied out of it, so
  // there is nothing to keep in step: a 401 leaves the query in error, and
  // that is what "signed out" means here.
  const session = useAuthMe();

  const { mutate: logout } = useAuthLogout({
    // Everything cached was fetched as the user who just left.
    //
    // resetQueries rather than clear: clear removes the queries but tells no one, so
    // an observer keeps reporting its last result until its component happens to
    // re-render for some other reason. The account menu does -- the mutation lives
    // there -- but the route guard does not, which left the reader sitting in the
    // shell with a dead session. reset notifies observers and refetches the active
    // ones, so the session query asks again, gets its 401, and the guard reacts.
    mutation: { onSuccess: () => queryClient.resetQueries() },
  });

  return {
    user: session.isSuccess ? session.data : null,
    isAuthenticated: session.isSuccess,
    isUnauthorized: session.error?.response?.status === 401,
    isPending: session.isPending,
    error: session.error,
    login,
    logout,
  };
}
