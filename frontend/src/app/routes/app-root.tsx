import { Outlet } from 'react-router';
import { AuthenticatedShell } from '@/components/layouts/authenticated-shell/authenticated-shell';
import { SearchBar } from '@/features/search/components/search-bar';

// The seam between the router and the shell. It exists so features can reach the app's
// chrome: the shell is shared code and may not import from features/, but this file is
// app-layer and may import from both. Anything feature-owned that belongs in the shell
// is passed in from here.
export function AppRoot() {
  return (
    <AuthenticatedShell search={<SearchBar />}>
      <Outlet />
    </AuthenticatedShell>
  );
}
