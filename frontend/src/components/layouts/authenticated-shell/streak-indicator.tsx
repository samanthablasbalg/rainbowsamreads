import { HugeiconsIcon } from '@hugeicons/react';
import { Fire02Icon } from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';

export function StreakIndicator({ days }: { days: number }) {
  return (
    <Badge variant="outline">
      <HugeiconsIcon icon={Fire02Icon} className="text-brand-orange" data-icon="inline-start" />
      {days} {days === 1 ? 'day' : 'days'}
    </Badge>
  );
}
