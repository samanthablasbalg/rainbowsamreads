import { Progress, ProgressValue } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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
