import { useBooksListBooksSuspense } from '@/api/generated/books/books';
import { EmptyState } from '@/components/common/empty-state';
import { CatalogRow } from './catalog-row';

// Every book the app knows about, read or not. This is the books table, and it has
// nothing to do with engagements: a book appears here the moment it is added, and stays
// after a read of it is deleted.
//
// `GET /api/books` takes no params and does not paginate, so there is nothing to pass
// and nothing to sort -- this renders the order the API returns.
//
// The suspense hook, so `books` is the list and nothing else: waiting and failing are
// the content area's, held by SuspendedOutlet and RouteError on the pathless route this
// renders under. There is no isPending branch, no isError branch and no null to guard --
// by the time this function runs, the data is there.
//
// The heading is sr-only: the shelf nav directly above already names this screen
// visually and marks it aria-current. What that does not do is put the shelf in the
// heading outline, which is a separate way to navigate, so the h1 stays in the tree.
export function Catalog() {
  const { data: books } = useBooksListBooksSuspense();

  return (
    <section>
      <h1 className="sr-only">Catalog</h1>

      {books.length === 0 ? (
        <EmptyState
          title="No books yet"
          description="Books you add show up here, whether or not you've read them."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {books.map((book) => (
            <CatalogRow key={book.id} book={book} />
          ))}
        </ul>
      )}
    </section>
  );
}
