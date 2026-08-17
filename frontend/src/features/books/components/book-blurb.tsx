import { useState } from 'react';
import { Format, type BookRead } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BookBlurb({ book }: { book: BookRead }) {
  const [expanded, setExpanded] = useState(false);

  // The print edition is the one Google actually described (ADR-0022); its synthetic
  // siblings carry no blurb of their own.
  const blurb = book.editions.find((e) => e.edition_format === Format.print)?.description;

  if (!blurb) {
    return null;
  }

  return (
    <div className="max-w-[68ch]">
      <div className="relative">
        {/* The stored text keeps Google's paragraph breaks as newlines, which HTML would
            otherwise collapse into one run-on block. */}
        <p
          className={cn('text-sm leading-relaxed whitespace-pre-line', !expanded && 'line-clamp-4')}
        >
          {blurb}
        </p>

        {/* Fades the clamped last line into the page rather than cutting it mid-stroke. */}
        {!expanded && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent"
          />
        )}
      </div>

      <Button
        variant="link"
        size="xs"
        className="h-auto p-0 font-extrabold text-ring"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Less' : 'More'}
      </Button>
    </div>
  );
}
