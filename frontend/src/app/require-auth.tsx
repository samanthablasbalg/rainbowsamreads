import { Navigate, Outlet } from 'react-router';
import { Pending } from '@/components/common/pending';
import { useAuth } from '@/lib/auth';

export function RequireAuth() {
  const { isPending, isUnauthorized, error } = useAuth();

  if (isPending) return <Pending />;
  if (isUnauthorized) return <Navigate to="/" replace />;
  if (error) throw error;

  return <Outlet />;
}

export function RequireGuest() {
  const { isPending, isAuthenticated } = useAuth();

  if (isPending) return <Pending />;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return <Outlet />;
}
