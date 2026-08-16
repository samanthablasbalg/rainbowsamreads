import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { EngagementRead } from '@/api/generated/readingTracker.schemas';
import { EmptyState } from '@/components/common/empty-state';
import { StarRating } from '@/components/common/star-rating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FORMATS } from '@/utils/format';
import { formatDaysBetween, formatIsoDate } from '@/utils/format-date';

// The row's date: when it finished, when it was abandoned, or when it started, in that
// order -- whichever of those actually happened last for this engagement.
function readingDate(engagement: EngagementRead): string | null {
  return engagement.finished_on ?? engagement.abandoned_on ?? engagement.started_on;
}

function readingDescriptor(engagement: EngagementRead): string {
  const formats = engagement.formats.map((format) => FORMATS[format].label).join(', ');
  const endedOn = engagement.finished_on ?? engagement.abandoned_on;
  if (!engagement.started_on || !endedOn) {
    return formats;
  }
  return `${formats} · ${formatDaysBetween(engagement.started_on, endedOn)}`;
}

// One row per engagement, newest first -- the order the API already returns them in.
// Rating, dates, format and review all belong to the row and never to the book: that is
// the whole reason this page has a list here instead of a single rating at the top.
export function BookReadings({
  tracked,
  engagements,
}: {
  tracked: boolean;
  engagements: EngagementRead[];
}) {
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
          {engagements.map((engagement) => {
            const date = readingDate(engagement);
            return (
              <details key={engagement.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
                  <span className="w-24 shrink-0 text-sm font-bold whitespace-nowrap">
                    {date && formatIsoDate(date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {readingDescriptor(engagement)}
                  </span>
                  {engagement.review?.rating && <StarRating rating={engagement.review.rating} />}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                  />
                </summary>

                <div className="flex flex-col items-start gap-2 px-4 pb-4 sm:pl-27">
                  {engagement.review?.body && (
                    <p className="font-serif text-sm leading-relaxed">{engagement.review.body}</p>
                  )}
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
            );
          })}
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
