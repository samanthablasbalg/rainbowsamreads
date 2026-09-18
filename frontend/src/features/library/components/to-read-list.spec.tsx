import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { buildEngagement } from '@/test/data-generators';
import { ToReadList } from './to-read-list';
import { getEngagementsListEngagementsMockHandler } from '@/api/generated/engagements/engagements.msw';

describe('ToReadList', () => {
  it('renders a row per book in the order the API returns them', async () => {
    server.use(
      getEngagementsListEngagementsMockHandler([
        buildEngagement({ title: 'Dune' }),
        buildEngagement({ title: 'Piranesi' }),
      ])
    );

    render(<ToReadList />);

    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual(['Dune', 'Piranesi']);
  });

  it('shows an empty state when there are no books', async () => {
    server.use(getEngagementsListEngagementsMockHandler([]));

    render(<ToReadList />);

    expect(await screen.findByText('Nothing to read yet')).toBeVisible();
  });

  it('shows a pending state while the list loads', () => {
    server.use(getEngagementsListEngagementsMockHandler([]));

    render(<ToReadList />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
