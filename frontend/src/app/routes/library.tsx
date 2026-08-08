import { Outlet } from 'react-router';
import { LibraryNav } from '@/features/library/components/library-nav';

// A layout route: it renders the shelf nav once and lets the router swap the shelf
// beneath it. Eager, unlike its four children -- it is the chrome their
// HydrateFallbacks render inside, so it has to already be there while a chunk loads.
export function Library() {
  return (
    <>
      <LibraryNav />
      <Outlet />
    </>
  );
}
