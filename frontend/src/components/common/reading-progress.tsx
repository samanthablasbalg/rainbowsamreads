import { Progress, ProgressValue } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// `pct` is null until a read has its first progress log -- completion_pct is derived
// server-side from the logs, so there's nothing to derive before the first one exists.
// Zero logged progress is honestly 0%, so this treats null the same as 0 rather than
// rendering Progress's indeterminate state, which reads as "loading" instead of
// "not started."
export function ReadingProgress({
  title,
  pct,
  className,
}: {
  title: string;
  pct: number | null;
  className?: string;
}) {
  const value = pct ?? 0;

  return (
    <Progress
      value={value}
      aria-label={`${title} progress: ${value}%`}
      className={cn('items-center', className)}
    >
      <ProgressValue className="order-last text-xs font-medium text-muted-foreground" />
    </Progress>
  );
}
