import { HugeiconsIcon } from '@hugeicons/react';
import { Fire02Icon } from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';

// `days` is required rather than defaulted because nothing serves this number yet.
// Making the caller supply it keeps the placeholder visible in the layout, where it
// reads as obviously fake, instead of hidden behind a default in here.
export function StreakIndicator({ days }: { days: number }) {
  return (
    <Badge variant="outline">
      {/* The handoff wants the flame in an orange accent, off the neutral scale. The
          palette already has one, so this uses that rather than adding a token. */}
      <HugeiconsIcon icon={Fire02Icon} className="text-brand-orange" data-icon="inline-start" />
      {days} {days === 1 ? 'day' : 'days'}
    </Badge>
  );
}
