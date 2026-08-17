import { getEngagementsListEngagementsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { buildEngagement } from '@/test/data-generators';
import { CurrentlyReading } from './currently-reading';

function reading(title: string) {
  return buildEngagement({
    title,
    status: ReadingStatus.reading,
    started_on: '2025-01-01',
    finished_on: null,
    resume_from_page: 0,
    completion_pct: null,
  });
}

describe('CurrentlyReading', () => {
  it('renders a card per engagement in the order the API returns them', async () => {
    server.use(getEngagementsListEngagementsMockHandler([reading('Dune'), reading('Piranesi')]));

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
