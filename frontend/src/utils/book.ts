import type { BookRead, EngagementRead } from '@/api/generated/readingTracker.schemas';

export function authorNames(book: BookRead): string {
  return book.authors.map((author) => author.name).join(', ');
}

export function coverSrc(engagement: EngagementRead): string | null {
  return engagement.cover_url ?? engagement.book.default_cover_url;
}
