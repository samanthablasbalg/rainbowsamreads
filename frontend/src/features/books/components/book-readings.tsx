import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { EmptyState } from '@/components/common/empty-state';
import { StarRating } from '@/components/common/star-rating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// One row per engagement, newest first. Engagements can't be fetched per book yet -- the
// list endpoint filters by status only -- so these are placeholders. Rating, dates, format
// and review all belong to the row and never to the book: that is the whole reason this
// page has a list here instead of a single rating at the top.
const READINGS = [
  {
    date: 'Feb 2026',
    descriptor: 'audiobook · 6 days · your edition',
    rating: '5.00',
    review:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  {
    date: 'Aug 2023',
    descriptor: 'paperback · 11 days',
    rating: '4.50',
    review: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  },
  {
    date: 'Mar 2019',
    descriptor: 'paperback · 3 weeks',
    rating: '4.00',
    review: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
  },
];

export function BookReadings({ tracked }: { tracked: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">Reading history</h2>

        {/* The only place on the page that offers to log a read. A book with three reads
            should not open with a banner shouting at you to read it again. */}
        <Button variant="link" size="xs" className="h-auto p-0 font-extrabold text-ring">
          + Log a reading
        </Button>
      </div>

      {tracked ? (
        <Card className="gap-0 divide-y divide-accent py-0">
          {READINGS.map((reading) => (
            <details key={reading.date} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
                <span className="w-20 shrink-0 text-sm font-bold">{reading.date}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {reading.descriptor}
                </span>
                <StarRating rating={reading.rating} />
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                />
              </summary>

              <div className="flex flex-col items-start gap-2 px-4 pb-4 sm:pl-27">
                <p className="font-serif text-sm leading-relaxed">{reading.review}</p>
                <div className="flex gap-4">
                  <Button variant="link" size="xs" className="h-auto p-0 font-bold text-ring">
                    Progress log
                  </Button>
                  <Button variant="link" size="xs" className="h-auto p-0 font-bold text-ring">
                    Edit read
                  </Button>
                </div>
              </div>
            </details>
          ))}
        </Card>
      ) : (
        <EmptyState
          title="No readings yet"
          description="Log a reading and its dates, format, rating and review live here — one row per time through."
          action={<Button variant="outline">Log a reading</Button>}
        />
      )}
    </section>
  );
}
