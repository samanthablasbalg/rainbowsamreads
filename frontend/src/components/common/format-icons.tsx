import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { BookOpen01Icon, HeadphonesIcon, Tablet01Icon } from '@hugeicons/core-free-icons';
import type { Format } from '@/api/generated/readingTracker.schemas';

// One icon per format a read is bound to. `formats` is an array, not a single value --
// the data model allows a read to be bound to more than one edition (print and audio on
// the same engagement) -- so this is a lookup applied per format, not a switch on
// `formats[0]`.
const FORMAT_ICONS: Record<Format, IconSvgElement> = {
  print: BookOpen01Icon,
  digital: Tablet01Icon,
  audio: HeadphonesIcon,
};

export function FormatIcons({ formats }: { formats: Format[] }) {
  return (
    <>
      {formats.map((format) => (
        <span
          key={format}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange px-2 py-0.5 text-xs font-semibold tracking-wide text-brand-orange-foreground uppercase"
        >
          <HugeiconsIcon
            icon={FORMAT_ICONS[format]}
            size={14}
            strokeWidth={2}
            role="img"
            aria-label={`Format: ${format}`}
          />
          {format}
        </span>
      ))}
    </>
  );
}
