import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useBooksGetBookSuspense } from '@/api/generated/books/books';
import { CoverImage } from '@/components/common/cover-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authorNames, formatAudioLength, formatPageCount } from '@/utils/book';
import { formatDateAtPrecision } from '@/utils/format-date';

const languageNames = new Intl.DisplayNames(undefined, { type: 'language' });

// `of` throws on a tag it cannot parse, and original_language is whatever Google Books
// stored.
function languageName(code: string): string {
  try {
    return languageNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function BookDetail({ bookId }: { bookId: string }) {
  const { data: book } = useBooksGetBookSuspense(bookId);

  const facts = [
    book.default_page_count && formatPageCount(book.default_page_count),
    book.default_audio_minutes && formatAudioLength(book.default_audio_minutes),
    book.publication_date &&
      formatDateAtPrecision(book.publication_date, book.publication_date_precision),
    book.original_language && languageName(book.original_language),
  ].filter(Boolean);

  return (
    <section>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 mb-2"
        render={<Link to="/library/catalog" />}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
        Catalog
      </Button>

      <header className="flex items-start gap-4">
        <CoverImage src={book.default_cover_url} title={book.title} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-heading text-xl leading-tight font-semibold">{book.title}</h1>
          <p className="text-sm text-muted-foreground">{authorNames(book)}</p>

          {book.genres.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {book.genres.map((genre) => (
                <Badge key={genre} variant="outline">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {facts.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{facts.join(' · ')}</p>
          )}
        </div>
      </header>
    </section>
  );
}
