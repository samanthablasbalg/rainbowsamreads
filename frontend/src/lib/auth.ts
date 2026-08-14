import { useQueryClient } from '@tanstack/react-query';
import { useAuthLogout, useAuthMe } from '@/api/generated/auth/auth';

export function login() {
  window.location.href = '/api/auth/login';
}

export function useAuth() {
  const queryClient = useQueryClient();

  const session = useAuthMe();

  const { mutate: logout } = useAuthLogout({
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
