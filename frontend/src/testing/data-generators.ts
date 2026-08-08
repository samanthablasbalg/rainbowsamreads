import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';

// Deterministic fixtures for specs and stories, as distinct from the generated
// `*.faker.ts` mocks: those produce *random* valid entities, which is right for "some
// response came back" and wrong here, since you cannot assert on a random rating and a
// story that changes every run churns snapshots.
//
// Here rather than in a feature because two features need EngagementRead -- library and
// currently-reading -- and the lint zones forbid features importing each other, so a
// fixture either lives outside them or gets copied. This is the folder punch list § 0
// reserved for it.
//
// Builder rather than a frozen literal so each caller states only what it varies; the
// rest is understood to be beside the point.
export function buildEngagement({
  title = 'Piranesi',
  ...overrides
}: Partial<EngagementRead> & { title?: string } = {}): EngagementRead {
  return {
    id: `engagement-${title}`,
    book: {
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
    },
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
