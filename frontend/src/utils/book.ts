import type { BookRead, EngagementRead } from '@/api/generated/readingTracker.schemas';

export function authorNames(book: BookRead): string {
  return book.authors.map((author) => author.name).join(', ');
}

export function coverSrc(engagement: EngagementRead): string | null {
  return engagement.cover_url ?? engagement.book.default_cover_url;
}

export function formatPageCount(pages: number): string {
  return `${pages} ${pages === 1 ? 'page' : 'pages'}`;
}

export function formatAudioLength(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ');
}
