import { Outlet, ScrollRestoration } from 'react-router';
import { AuthenticatedShell } from '@/components/layouts/authenticated-shell/authenticated-shell';
import { SearchBar } from '@/features/search/components/search-bar';

export function AppRoot() {
  return (
    <>
      <AuthenticatedShell search={<SearchBar />}>
        <Outlet />
      </AuthenticatedShell>

      {/* Client navigation moves nothing, so opening a book from halfway down the catalog
          opened it halfway down. Rendered once, here: the layout every navigable page
          sits under.

          Keyed by pathname rather than by history entry, because the way back to a shelf
          is the Catalog link on the page, not the browser's back button -- and a link is
          a push, which by default has no saved offset and lands at the top. By pathname,
          returning to a shelf returns to where it was left, however you got there. */}
      <ScrollRestoration getKey={(location) => location.pathname} />
    </>
  );
}
