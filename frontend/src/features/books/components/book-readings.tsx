import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { type BookRead, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { EmptyState } from '@/components/common/empty-state';
import { StarRating } from '@/components/common/star-rating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FORMATS } from '@/utils/format';
import { formatDaysBetween, formatIsoDate } from '@/utils/format-date';
import { LogReadingSheet } from './log-reading-sheet';

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

export function BookReadings({
  book,
  engagements,
}: {
  book: BookRead;
  engagements: EngagementRead[];
}) {
  const [logOpen, setLogOpen] = useState(false);
  const hasReadings = engagements.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">Reading history</h2>

        {hasReadings && (
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0 font-extrabold text-ring"
            onClick={() => setLogOpen(true)}
          >
            + Log a reading
          </Button>
        )}
      </div>

      {hasReadings ? (
        <Card className="gap-0 divide-y divide-accent py-0">
          {engagements.map((engagement) => {
            const date = readingDate(engagement);
            return (
              <Collapsible key={engagement.id}>
                <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left">
                  <span className="w-24 shrink-0 text-sm font-bold whitespace-nowrap">
                    {date && formatIsoDate(date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {readingDescriptor(engagement)}
                  </span>
                  {engagement.review?.rating && (
                    <StarRating rating={Number(engagement.review.rating)} />
                  )}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90"
                  />
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="flex flex-col items-start gap-2 px-4 pb-4 sm:pl-27">
                    {engagement.review?.body && (
                      <p className="font-serif text-sm leading-relaxed">{engagement.review.body}</p>
                    )}
                    <div className="flex gap-4">
                      <Button
                        variant="link"
                        size="xs"
                        className="h-auto p-0 font-bold text-ring"
                        render={<Link to={`/reads/${engagement.id}`} />}
                      >
                        Progress log
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          title="No readings yet"
          description="Log a reading and its dates, format, rating and review live here — one row per time through."
          action={
            <Button variant="outline" onClick={() => setLogOpen(true)}>
              Log a reading
            </Button>
          }
        />
      )}

      <LogReadingSheet book={book} open={logOpen} onOpenChange={setLogOpen} />
    </section>
  );
}
