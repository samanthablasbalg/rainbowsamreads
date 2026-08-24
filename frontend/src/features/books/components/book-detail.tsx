import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useSuspenseQueries } from '@tanstack/react-query';
import {
  getBooksGetBookSuspenseQueryOptions,
  getBooksListBookEngagementsSuspenseQueryOptions,
} from '@/api/generated/books/books';
import type { BookRead, EngagementRead } from '@/api/generated/readingTracker.schemas';
import type { DetailError } from '@/api/error-detail';
import { CoverImage } from '@/components/common/cover-image';
import { Button } from '@/components/ui/button';
import { BookBlurb } from './book-blurb';
import { BookContents } from './book-contents';
import { BookMetadata } from './book-metadata';
import { BookChips, BookHeader } from './book-header';
import { BookReadings } from './book-readings';

export function BookDetail({ bookId }: { bookId: string }) {
  const [{ data: book }, { data: engagements }] = useSuspenseQueries<
    [[BookRead, DetailError], [EngagementRead[], DetailError]]
  >({
    queries: [
      getBooksGetBookSuspenseQueryOptions(bookId),
      getBooksListBookEngagementsSuspenseQueryOptions(bookId),
    ],
  });

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

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-5 lg:flex lg:gap-8">
        <aside className="contents lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:gap-4">
          <CoverImage
            src={book.default_cover_url}
            title={book.title}
            className="aspect-[2/3] h-auto w-28 rounded-xl shadow-lg lg:w-full"
          />

          <div className="order-1 col-span-2 lg:order-none">
            <BookMetadata book={book} engagements={engagements} />
          </div>
        </aside>

        <div className="contents lg:flex lg:min-w-0 lg:max-w-2xl lg:flex-1 lg:flex-col lg:gap-6">
          <BookHeader book={book} />

          <div className="col-span-2 flex flex-col gap-4">
            <BookChips book={book} />
            <BookBlurb book={book} />
          </div>

          <div className="order-2 col-span-2 flex flex-col gap-6 lg:order-none">
            <BookContents />
            <BookReadings book={book} engagements={engagements} />
          </div>
        </div>
      </div>
    </section>
  );
}
