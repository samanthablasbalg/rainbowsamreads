import { useBooksListBooksSuspense } from '@/api/generated/books/books';
import { EmptyState } from '@/components/common/empty-state';
import { CatalogRow } from './catalog-row';

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
