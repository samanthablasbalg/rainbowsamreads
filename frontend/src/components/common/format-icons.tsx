import { HugeiconsIcon } from '@hugeicons/react';
import type { Format } from '@/api/generated/readingTracker.schemas';
import { FORMATS } from '@/utils/format';

export function FormatIcons({ formats }: { formats: Format[] }) {
  return (
    <>
      {formats.map((format) => (
        <span
          key={format}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange px-2 py-0.5 text-xs font-semibold tracking-wide text-brand-orange-foreground uppercase"
        >
          <HugeiconsIcon icon={FORMATS[format].icon} size={14} strokeWidth={2} aria-hidden="true" />
          {FORMATS[format].label}
        </span>
      ))}
    </>
  );
}
