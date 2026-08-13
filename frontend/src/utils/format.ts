import type { IconSvgElement } from '@hugeicons/react';
import { BookOpen01Icon, HeadphonesIcon, Tablet01Icon } from '@hugeicons/core-free-icons';
import type { Format } from '@/api/generated/readingTracker.schemas';

// How each format is drawn, everywhere it is drawn: the chips on a row and the picker's
// buttons. The icon never appears without the name beside it, so the two travel together
// rather than living in separate tables.
//
// Its own module rather than an export from format-icons.tsx: exporting a constant
// alongside a component breaks Fast Refresh for that file, the same reason describeError
// stays private to ErrorState.
export const FORMATS: Record<Format, { label: string; icon: IconSvgElement }> = {
  print: { label: 'Print', icon: BookOpen01Icon },
  digital: { label: 'Digital', icon: Tablet01Icon },
  audio: { label: 'Audio', icon: HeadphonesIcon },
};
