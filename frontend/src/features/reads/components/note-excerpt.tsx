import { useLayoutEffect, useRef, useState } from 'react';
import { NoteMarkdown } from '@/components/common/note-markdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// The clamp itself is free, but CSS cannot report whether it cut anything -- there is no
// selector for "this got truncated" -- so the only way to know whether the toggle is
// warranted is to compare the box's rendered height against its content height once the
// element exists. A toggle on a note that already fits expands to reveal nothing.
export function NoteExcerpt({ children }: { children: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Not measured while expanded: with the clamp off the box grows to fit, so the two
  // heights match and the note reports as fitting -- retracting the toggle that is
  // currently holding it open. The last collapsed answer is the one that stays true.
  //
  // The 1px slack is for fractional line-heights, which can leave scrollHeight a hair
  // over clientHeight on a note that fills the fifth line exactly.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [expanded, children]);

  return (
    <div className="font-reading text-sm">
      <div ref={ref} className={cn(!expanded && 'line-clamp-5')}>
        <NoteMarkdown>{children}</NoteMarkdown>
      </div>

      {overflows && (
        <Button
          variant="link"
          size="sm"
          className="mt-1 h-auto p-0 font-sans text-xs font-bold text-brand-pink"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </div>
  );
}
