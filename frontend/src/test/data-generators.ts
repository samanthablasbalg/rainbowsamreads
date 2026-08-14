import {
  DatePrecision,
  Format,
  ReadingStatus,
  type BookRead,
  type EngagementRead,
  type MinuteProgressLogRead,
  type PageProgressLogRead,
} from '@/api/generated/readingTracker.schemas';

export function buildBook({
  title = 'Piranesi',
  ...overrides
}: Partial<BookRead> & { title?: string } = {}): BookRead {
  return {
    id: `book-${title}`,
    title,
    authors: [{ id: 'author-1', name: 'Susanna Clarke' }],
    google_books_id: null,
    default_cover_url: null,
    default_page_count: 272,
    default_audio_minutes: null,
    original_language: null,
    genres: [],
    publication_date: null,
    publication_date_precision: DatePrecision.year,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildEngagement({
  title = 'Piranesi',
  ...overrides
}: Partial<EngagementRead> & { title?: string } = {}): EngagementRead {
  return {
    id: `engagement-${title}`,
    book: buildBook({ title }),
    formats: [Format.print],
    cover_url: null,
    status: ReadingStatus.finished,
    started_on: '2025-01-01',
    finished_on: '2025-03-12',
    abandoned_on: null,
    resume_from_page: 272,
    resume_from_minute: 0,
    completion_pct: 100,
    review: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildAudioEngagement({
  title = 'Piranesi',
  ...overrides
}: Partial<EngagementRead> & { title?: string } = {}): EngagementRead {
  return buildEngagement({
    title,
    formats: [Format.audio],
    book: buildBook({ title, default_page_count: null, default_audio_minutes: 600 }),
    ...overrides,
  });
}

export function buildPageLog(overrides: Partial<PageProgressLogRead> = {}): PageProgressLogRead {
  return {
    id: 'log-1',
    engagement_id: 'engagement-Piranesi',
    logged_on: '2025-06-15',
    new_ground: true,
    type: 'page',
    page_start: 50,
    page_end: 100,
    ...overrides,
  };
}

export function buildMinuteLog(
  overrides: Partial<MinuteProgressLogRead> = {}
): MinuteProgressLogRead {
  return {
    id: 'log-1',
    engagement_id: 'engagement-Piranesi',
    logged_on: '2025-06-15',
    new_ground: true,
    type: 'minute',
    minute_start: 80,
    minute_end: 125,
    ...overrides,
  };
}
