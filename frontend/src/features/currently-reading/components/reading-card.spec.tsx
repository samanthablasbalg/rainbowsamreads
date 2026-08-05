import { render, screen } from '@testing-library/react';
import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { ReadingCard } from './reading-card';

function buildEngagement(overrides: Partial<EngagementRead> = {}): EngagementRead {
  return {
    id: 'engagement-1',
    book: {
      id: 'book-1',
      title: 'Piranesi',
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
    status: ReadingStatus.reading,
    started_on: '2025-01-01',
    finished_on: null,
    abandoned_on: null,
    resume_from_page: 0,
    resume_from_minute: 0,
    completion_pct: 52,
    review: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderInList(engagement: EngagementRead) {
  return render(
    <ul>
      <ReadingCard engagement={engagement} />
    </ul>
  );
}

describe('ReadingCard', () => {
  it('renders the title, author and progress on a listitem named for the book', () => {
    renderInList(buildEngagement());

    const card = screen.getByRole('listitem', { name: 'Piranesi' });
    expect(card).toHaveTextContent('Susanna Clarke');
    expect(screen.getByRole('progressbar', { name: 'Piranesi progress: 52%' })).toBeVisible();
  });

  it('joins multiple authors with a comma', () => {
    renderInList(
      buildEngagement({
        book: {
          ...buildEngagement().book,
          authors: [
            { id: 'author-1', name: 'Terry Pratchett' },
            { id: 'author-2', name: 'Neil Gaiman' },
          ],
        },
      })
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('Terry Pratchett, Neil Gaiman');
  });

  it('renders one format icon per format the read is bound to', () => {
    renderInList(buildEngagement({ formats: [Format.print, Format.digital, Format.audio] }));

    expect(screen.getByRole('img', { name: 'Format: print' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Format: digital' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Format: audio' })).toBeVisible();
  });

  it('renders no format icon when the read has no formats', () => {
    renderInList(buildEngagement({ formats: [] }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the log-progress and overflow-menu buttons with book-specific labels', () => {
    renderInList(buildEngagement());

    expect(screen.getByRole('button', { name: 'Log progress for Piranesi' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'More actions for Piranesi' })).toBeVisible();
  });

  it("prefers the read's own cover over the book's default", () => {
    const { container } = renderInList(
      buildEngagement({
        cover_url: 'https://example.com/this-read.jpg',
        book: { ...buildEngagement().book, default_cover_url: 'https://example.com/default.jpg' },
      })
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/this-read.jpg'
    );
  });

  it("falls back to the book's default cover when the read has none of its own", () => {
    const { container } = renderInList(
      buildEngagement({
        cover_url: null,
        book: { ...buildEngagement().book, default_cover_url: 'https://example.com/default.jpg' },
      })
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/default.jpg'
    );
  });
});
