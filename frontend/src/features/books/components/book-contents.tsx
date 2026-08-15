import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Nothing stores a book's parts yet. Six is a deliberate placeholder size: enough to show
// the read/unread split, few enough that the real thing -- a 30-issue omnibus -- is
// obviously the case the list has to survive.
const PARTS = [
  { title: 'Lorem ipsum dolor sit', position: 'pp. 1–48', readOn: 'Jan 2026' },
  { title: 'Consectetur adipiscing elit', position: 'pp. 49–96', readOn: 'Jan 2026' },
  { title: 'Sed do eiusmod tempor', position: 'pp. 97–152', readOn: 'Feb 2026' },
  { title: 'Incididunt ut labore', position: 'pp. 153–208', readOn: 'Feb 2026' },
  { title: 'Ut enim ad minim veniam', position: 'pp. 209–264', readOn: null },
  { title: 'Quis nostrud exercitation', position: 'pp. 265–320', readOn: null },
];

export function BookContents({ tracked }: { tracked: boolean }) {
  const read = PARTS.filter((part) => part.readOn).length;
  const pct = Math.round((read / PARTS.length) * 100);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">Contents</h2>
        {tracked && (
          <p className="text-xs font-bold text-muted-foreground">
            {read} of {PARTS.length} parts · {pct}%
          </p>
        )}
      </div>

      {tracked ? (
        <Card className="gap-0 divide-y divide-accent py-0">
          <div className="px-4 py-3.5">
            <Progress value={pct} aria-label="Parts read" />
          </div>

          {PARTS.map((part) => (
            <div key={part.title} className="flex items-center gap-3 px-4 py-3">
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full',
                  part.readOn ? 'bg-primary text-primary-foreground' : 'border-2 border-border'
                )}
              >
                {part.readOn && <HugeiconsIcon icon={Tick02Icon} className="size-3" />}
              </span>

              <span className={cn('min-w-0 flex-1 font-serif', part.readOn && 'opacity-60')}>
                {part.title}
              </span>

              {/* Both trailing columns are fixed and equal, so a row that offers Log and a
                  row that reports a date put their page range in the same place. */}
              <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground sm:block">
                {part.position}
              </span>

              {part.readOn ? (
                <span className="w-24 shrink-0 text-right text-xs whitespace-nowrap text-muted-foreground">
                  read {part.readOn}
                </span>
              ) : (
                <Button
                  variant="link"
                  size="xs"
                  className="h-auto w-24 shrink-0 justify-end p-0 font-extrabold text-ring"
                >
                  Log
                </Button>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <Button variant="link" size="xs" className="h-auto p-0 font-extrabold text-ring">
              Add or edit parts
            </Button>
            <span className="text-xs text-muted-foreground">
              logging a part doesn't change the book's status
            </span>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="Contents not set up"
          description="Break the book into stories, issues or chapters and you can log them one at a time."
          action={<Button variant="outline">Set up contents</Button>}
        />
      )}
    </section>
  );
}
