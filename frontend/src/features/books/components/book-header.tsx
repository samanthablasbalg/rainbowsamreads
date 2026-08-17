import type { BookRead } from '@/api/generated/readingTracker.schemas';
import { Badge } from '@/components/ui/badge';
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

// Chips carry one of four meanings, and the fill is what says which: facts are unfilled,
// taxonomy takes a tint, the user's own activity is pink, ownership is green. Genres are
// free text from Google Books, so they get a tint by hashing rather than a lookup table --
// the same genre lands on the same colour every time. Pink (--tint-1) and green (--tint-3)
// stay out of the set; they belong to the other two meanings.
const GENRE_TINTS = ['bg-tint-2', 'bg-tint-4', 'bg-tint-5', 'bg-tint-6'];

function genreTint(genre: string): string {
  const sum = [...genre].reduce((total, char) => total + char.charCodeAt(0), 0);
  return GENRE_TINTS[sum % GENRE_TINTS.length];
}

export function BookHeader({ book }: { book: BookRead }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h1 className="text-3xl leading-tight font-semibold text-pretty lg:text-4xl">{book.title}</h1>

      {/* Authors are not routable yet, so the brand pink here is typography rather than an
          affordance -- no underline, no link. The date rides this line rather than taking
          one of its own; it is an attribute of the book, not a second fact about it. */}
      <p className="text-sm">
        by <span className="font-bold text-brand-pink">{authorNames(book)}</span>
        {book.publication_date && (
          <span className="text-muted-foreground">
            {' · '}
            {formatDateAtPrecision(book.publication_date, book.publication_date_precision)}
          </span>
        )}
      </p>
    </div>
  );
}

export function BookChips({ book }: { book: BookRead }) {
  const facts = [
    book.default_page_count && formatPageCount(book.default_page_count),
    book.default_audio_minutes && formatAudioLength(book.default_audio_minutes),
    book.original_language && languageName(book.original_language),
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1.5">
      {facts.map((fact) => (
        <Badge key={fact} variant="outline" className="bg-transparent text-muted-foreground">
          {fact}
        </Badge>
      ))}

      {book.genres.map((genre) => (
        <Badge key={genre} className={`${genreTint(genre)} text-foreground`}>
          {genre}
        </Badge>
      ))}
    </div>
  );
}
