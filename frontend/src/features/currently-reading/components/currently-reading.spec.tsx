import { getEngagementsListEngagementsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { DatePrecision, Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import type { EngagementRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { CurrentlyReading } from './currently-reading';

function buildEngagement(title: string): EngagementRead {
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
    status: ReadingStatus.reading,
    started_on: '2025-01-01',
    finished_on: null,
    abandoned_on: null,
    resume_from_page: 0,
    resume_from_minute: 0,
    completion_pct: null,
    review: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

describe('CurrentlyReading', () => {
  it('renders a card per engagement in the order the API returns them', async () => {
    server.use(
      getEngagementsListEngagementsMockHandler([
        buildEngagement('Dune'),
        buildEngagement('Piranesi'),
      ])
    );

    render(<CurrentlyReading />);

    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
    const cards = screen.getAllByRole('listitem');
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual(['Dune', 'Piranesi']);
  });

  it('shows an empty state when there are no engagements', async () => {
    server.use(getEngagementsListEngagementsMockHandler([]));

    render(<CurrentlyReading />);

    expect(await screen.findByText('Nothing in progress')).toBeVisible();
  });

  it('shows a pending state while the list loads', () => {
    server.use(getEngagementsListEngagementsMockHandler([]));

    render(<CurrentlyReading />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
