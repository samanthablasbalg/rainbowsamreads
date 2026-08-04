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
    mutation: { onSuccess: () => queryClient.clear() },
  });

  return {
    user: session.isSuccess ? session.data : null,
    isAuthenticated: session.isSuccess,
    isUnauthorized: session.error?.response?.status === 401,
    isPending: session.isPending,
    login,
    logout,
  };
}
