import { HugeiconsIcon } from '@hugeicons/react';
import { Book02Icon } from '@hugeicons/core-free-icons';
import { useBooksListBooks } from '@/api/generated/books/books';
import { ErrorState } from '@/components/common/error-state';
import { Pending } from '@/components/common/pending';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { CatalogRow } from './catalog-row';

// Every book the app knows about, read or not. This is the books table, and it has
// nothing to do with engagements: a book appears here the moment it is added, and stays
// after a read of it is deleted.
//
// `GET /api/books` takes no params and does not paginate, so there is nothing to pass
// and nothing to sort -- this renders the order the API returns.
//
// The heading is sr-only: the shelf nav directly above already names this screen
// visually and marks it aria-current. What that does not do is put the shelf in the
// heading outline, which is a separate way to navigate, so the h1 stays in the tree.
export function Catalog() {
  const { data: books, isPending, isError, error, refetch } = useBooksListBooks();

  return (
    <section>
      <h1 className="sr-only">Catalog</h1>

      {isPending && <Pending />}
      {isError && (
        <ErrorState
          error={error}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {books && books.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Book02Icon} />
            </EmptyMedia>
            <EmptyTitle>No books yet</EmptyTitle>
            <EmptyDescription>
              Books you add show up here, whether or not you&apos;ve read them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {books && books.length > 0 && (
        <ul className="flex flex-col gap-3">
          {books.map((book) => (
            <CatalogRow key={book.id} book={book} />
          ))}
        </ul>
      )}
    </section>
  );
}
