import { Outlet } from 'react-router';
import { LibraryNav } from '@/features/library/components/library-nav';

export function Library() {
  return (
    <>
      <LibraryNav />
      <Outlet />
    </>
  );
}
