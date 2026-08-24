import {
  DatePrecision,
  Format,
  LogUnit,
  ReadingStatus,
  type BookRead,
  type EngagementRead,
  type MinuteProgressLogRead,
  type PageProgressLogRead,
} from '@/api/generated/readingTracker.schemas';
import type { EntryView } from '@/features/reads/utils/entry-view';

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
    description: null,
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
    // Equal to the resume points, as they are for every read with no catch-up open.
    // Override just these to build one that has.
    frontier_page: 272,
    frontier_minute: 0,
    resume_unit: LogUnit.pages,
    length_pages: 272,
    length_minutes: null,
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
    resume_unit: LogUnit.minutes,
    length_pages: null,
    length_minutes: 600,
    ...overrides,
  });
}

// The history groups rows by created_at -- a session that crossed the frontier is two
// rows written in one transaction. So the default has to be distinct per log, or two
// unrelated ones read as a single split session. Build a split pair by passing both
// rows the same created_at.
let createdAtSequence = 0;

function nextCreatedAt(): string {
  createdAtSequence += 1;
  return new Date(Date.UTC(2025, 5, 15, 12, 0, createdAtSequence)).toISOString();
}

export function buildPageLog(overrides: Partial<PageProgressLogRead> = {}): PageProgressLogRead {
  return {
    id: 'log-1',
    engagement_id: 'engagement-Piranesi',
    logged_on: '2025-06-15',
    created_at: nextCreatedAt(),
    new_ground: true,
    note: null,
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
    created_at: nextCreatedAt(),
    new_ground: true,
    note: null,
    type: 'minute',
    minute_start: 80,
    minute_end: 125,
    ...overrides,
  };
}

// The view model the history builds out of a log, not an API type -- but it is what the
// entry card and the edit sheet both take as their prop, so it is a fixture like any
// other. Matches buildPageLog's defaults: pp. 50-100 of a 200-page read.
export function buildEntryView(overrides: Partial<EntryView> = {}): EntryView {
  return {
    id: 'log-1',
    dateLabel: 'Sun, Jun 15, 2025',
    dayLabel: 'Jun 15',
    weekdayLabel: 'Sun',
    fromLabel: 'p. 50',
    toLabel: 'p. 100',
    amountLabel: '+50 pp',
    spanLabel: 'New ground, p. 50 to p. 100',
    isNewest: true,
    loggedOn: '2025-06-15',
    isAudio: false,
    start: 50,
    end: 100,
    hasNewGround: true,
    splitAt: 50,
    startPct: 25,
    splitPct: 25,
    endPct: 50,
    coveredPct: 25,
    note: null,
    ...overrides,
  };
}
