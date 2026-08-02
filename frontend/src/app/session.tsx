import { useAuth } from '../features/auth/api/use-auth';

// Temporary. Replaced when the router lands.
export function Session() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Checking…</p>;
  if (!user) return <p>Signed out</p>;
  return (
    <p>
      Signed in as {user.email} ({user.id})
    </p>
  );
}
