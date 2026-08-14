import type { IconSvgElement } from '@hugeicons/react';
import { BookOpen01Icon, HeadphonesIcon, Tablet01Icon } from '@hugeicons/core-free-icons';
import type { Format } from '@/api/generated/readingTracker.schemas';

// Its own module because exporting a constant alongside a component breaks Fast Refresh
// for that file.
export const FORMATS: Record<Format, { label: string; icon: IconSvgElement }> = {
  print: { label: 'Print', icon: BookOpen01Icon },
  digital: { label: 'Digital', icon: Tablet01Icon },
  audio: { label: 'Audio', icon: HeadphonesIcon },
};
