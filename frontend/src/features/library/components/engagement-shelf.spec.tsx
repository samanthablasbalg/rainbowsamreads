import { http, HttpResponse } from 'msw';
import { getEngagementsListEngagementsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { buildEngagement } from '@/test/data-generators';
import { EngagementShelf } from './engagement-shelf';

function renderShelf(status: ReadingStatus = ReadingStatus.finished) {
  return render(
    <EngagementShelf
      status={status}
      heading="Finished"
      emptyTitle="Nothing finished yet"
      emptyDescription="Books you finish reading show up here."
    />
  );
}

describe('EngagementShelf', () => {
  it('renders a row per engagement in the order the API returns them', async () => {
    server.use(
      getEngagementsListEngagementsMockHandler([
        buildEngagement({ title: 'Dune' }),
        buildEngagement({ title: 'Piranesi' }),
      ])
    );

    renderShelf();

    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual(['Dune', 'Piranesi']);
  });

  it('asks the API for the status it was given', async () => {
    const requested: string[] = [];
    server.use(
      http.get('*/api/engagements', ({ request }) => {
        requested.push(new URL(request.url).searchParams.get('status') ?? '');
        return HttpResponse.json([]);
      })
    );

    renderShelf(ReadingStatus.dnf);

    expect(await screen.findByText('Nothing finished yet')).toBeVisible();
    expect(requested).toEqual(['dnf']);
  });

  it('shows the empty state it was given when there are no engagements', async () => {
    server.use(getEngagementsListEngagementsMockHandler([]));

    renderShelf();

    expect(await screen.findByText('Nothing finished yet')).toBeVisible();
  });

  it('shows a pending state while the list loads', () => {
    server.use(getEngagementsListEngagementsMockHandler([]));

    renderShelf();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
