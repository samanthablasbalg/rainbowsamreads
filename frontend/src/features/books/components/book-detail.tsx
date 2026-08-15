import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useBooksGetBookSuspense } from '@/api/generated/books/books';
import { CoverImage } from '@/components/common/cover-image';
import { Button } from '@/components/ui/button';
import { BookBlurb } from './book-blurb';
import { BookContents } from './book-contents';
import { BookMetadata } from './book-metadata';
import { BookChips, BookHeader } from './book-header';
import { BookReadings } from './book-readings';

// Status, ratings, ownership, recommender, parts and readings are all placeholder content:
// none of them is fetchable yet. This is the one switch that decides whether the page
// renders as read-three-times or never-touched, and it goes when the engagement query for
// a book lands.
const TRACKED = true;

export function BookDetail({ bookId }: { bookId: string }) {
  const { data: book } = useBooksGetBookSuspense(bookId);

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

      {/* Two independent columns at lg, so the tall cover can't hold the main column's
          first row open. Stacked, it is a grid instead -- the only way the cover sits
          beside the title -- and the two wrappers go `contents` so their blocks are page
          level grid items. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-5 lg:flex lg:gap-8">
        <aside className="contents lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:gap-4">
          <CoverImage
            src={book.default_cover_url}
            title={book.title}
            className="aspect-[2/3] h-auto w-28 rounded-xl shadow-lg lg:w-full"
          />

          {/* Sits under the blurb on a phone, where the book itself comes first and this
              earns its place after it; back up into the rail once there is one. */}
          <div className="order-1 col-span-2 lg:order-none">
            <BookMetadata tracked={TRACKED} />
          </div>
        </aside>

        {/* One measure for the whole column, so Contents and Reading history line up
            instead of ending 64px apart. */}
        <div className="contents lg:flex lg:min-w-0 lg:max-w-2xl lg:flex-1 lg:flex-col lg:gap-6">
          <BookHeader book={book} />

          <div className="col-span-2 flex flex-col gap-4">
            <BookChips book={book} />
            <BookBlurb />
          </div>

          {/* Contents takes the wide column because it can run to thirty rows; the history
              under it caps its own width so a single entry still looks deliberate. */}
          <div className="order-2 col-span-2 flex flex-col gap-6 lg:order-none">
            <BookContents tracked={TRACKED} />
            <BookReadings tracked={TRACKED} />
          </div>
        </div>
      </div>
    </section>
  );
}
