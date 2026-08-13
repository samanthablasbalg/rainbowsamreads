import { HugeiconsIcon } from '@hugeicons/react';
import type { Format } from '@/api/generated/readingTracker.schemas';
import { FORMATS } from '@/utils/format';

// `formats` is an array, not a single value -- the data model allows a read to be bound to
// more than one edition (print and audio on the same engagement) -- so this is a lookup
// applied per format, not a switch on `formats[0]`.
//
// The chip uppercases in CSS, so the label renders the same as the raw format value did.
//
// The icon is decorative: the label sits right beside it saying the same thing, so a named
// icon makes a screen reader announce the format twice. The chip's text is the one that
// carries it.
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
