import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// The model has no summary column yet -- Google Books returns one, nothing stores it. The
// point of the placeholder is its length: publisher summaries run long, and the clamp is
// what stops one pushing the reading history off the screen.
const PLACEHOLDER =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.';

export function BookBlurb() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-[68ch]">
      <div className="relative">
        <p className={cn('text-sm leading-relaxed', !expanded && 'line-clamp-4')}>{PLACEHOLDER}</p>

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
