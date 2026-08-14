import { Outlet } from 'react-router';
import { AuthenticatedShell } from '@/components/layouts/authenticated-shell/authenticated-shell';
import { SearchBar } from '@/features/search/components/search-bar';

export function AppRoot() {
  return (
    <AuthenticatedShell search={<SearchBar />}>
      <Outlet />
    </AuthenticatedShell>
  );
}
