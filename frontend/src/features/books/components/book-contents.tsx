import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Nothing stores a book's parts yet, so this list is scenery: it sits behind the blur to
// show the shape the section will take. Six is a deliberate placeholder size -- enough to
// show the read/unread split, few enough that the real thing (a 30-issue omnibus) is
// obviously the case the list has to survive.
const PARTS = [
  { title: 'Lorem ipsum dolor sit', position: 'pp. 1–48', readOn: 'Jan 2026' },
  { title: 'Consectetur adipiscing elit', position: 'pp. 49–96', readOn: 'Jan 2026' },
  { title: 'Sed do eiusmod tempor', position: 'pp. 97–152', readOn: 'Feb 2026' },
  { title: 'Incididunt ut labore', position: 'pp. 153–208', readOn: 'Feb 2026' },
  { title: 'Ut enim ad minim veniam', position: 'pp. 209–264', readOn: null },
  { title: 'Quis nostrud exercitation', position: 'pp. 265–320', readOn: null },
];

export function BookContents() {
  return (
    <Collapsible className="flex flex-col gap-3">
      <h2>
        <CollapsibleTrigger
          render={
            <Button variant="ghost" className="group -ml-3 h-auto py-1 text-lg font-semibold" />
          }
        >
          Contents
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            data-icon="inline-end"
            className="transition-transform group-data-[panel-open]:rotate-180"
          />
        </CollapsibleTrigger>
      </h2>

      <CollapsibleContent>
        <div className="relative">
          {/* Scenery, not content: hidden from assistive tech and stripped of every real
              control, so nothing in here is reachable by keyboard behind the blur. */}
          <div aria-hidden="true" className="pointer-events-none blur-[3px] select-none">
            <Card className="gap-0 divide-y divide-accent py-0">
              <div className="px-4 py-3.5">
                <Progress value={33} />
              </div>

              {PARTS.map((part) => (
                <div key={part.title} className="flex items-center gap-3 px-4 py-3">
                  <span
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

                  {/* Both trailing columns are fixed and equal, so a row that offers Log and
                      a row that reports a date put their page range in the same place. */}
                  <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground sm:block">
                    {part.position}
                  </span>

                  <span
                    className={cn(
                      'w-24 shrink-0 text-right text-xs whitespace-nowrap',
                      part.readOn ? 'text-muted-foreground' : 'font-extrabold text-ring'
                    )}
                  >
                    {part.readOn ? `read ${part.readOn}` : 'Log'}
                  </span>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                <span className="text-xs font-extrabold text-ring">Add or edit parts</span>
                <span className="text-xs text-muted-foreground">
                  logging a part doesn't change the book's status
                </span>
              </div>
            </Card>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-background/80 px-4 py-1.5 font-serif text-muted-foreground italic">
              Coming soon
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
