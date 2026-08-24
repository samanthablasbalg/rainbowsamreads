import { useLayoutEffect, useRef, useState } from 'react';
import { NoteMarkdown } from '@/components/common/note-markdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NoteExcerpt({ children }: { children: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
