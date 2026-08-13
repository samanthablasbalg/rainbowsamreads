import type { BookRead, EngagementRead } from '@/api/generated/readingTracker.schemas';

export function authorNames(book: BookRead): string {
  return book.authors.map((author) => author.name).join(', ');
}

// A read's own cover wins over the book's default: the same book read twice can carry a
// different edition's cover each time. Falls back to null, which CoverImage renders as
// its placeholder.
export function coverSrc(engagement: EngagementRead): string | null {
  return engagement.cover_url ?? engagement.book.default_cover_url;
}
