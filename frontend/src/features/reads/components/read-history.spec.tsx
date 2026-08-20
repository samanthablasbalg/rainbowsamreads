import { waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import {
  getEngagementsGetEngagementMockHandler,
  getEngagementsListProgressLogsMockHandler,
} from '@/api/generated/engagements/engagements.msw';
import { Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { buildAudioEngagement, buildEngagement, buildPageLog } from '@/test/data-generators';
import { ReadHistory } from './read-history';

describe('ReadHistory', () => {
  beforeEach(() => {
    server.use(getEngagementsListProgressLogsMockHandler([buildPageLog()]));
  });

  it('renders the read it was given the id of', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(
        buildEngagement({ status: ReadingStatus.reading, completion_pct: 37 })
      )
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('heading', { name: 'Piranesi' })).toBeVisible();
    expect(screen.getByText('Susanna Clarke')).toBeVisible();
    expect(screen.getByText('Print')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Piranesi progress: 37%');

    expect(await screen.findByRole('list', { name: 'History' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the start and finish dates of a finished read', async () => {
    server.use(getEngagementsGetEngagementMockHandler(buildEngagement()));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('button', { name: 'Edit start date' })).toHaveTextContent(
      'Jan 1, 2025'
    );
    expect(screen.getByRole('button', { name: 'Edit finish date' })).toHaveTextContent(
      'Mar 12, 2025'
    );
  });

  // PATCH /dates takes started_on and finished_on only, so an abandoned date is shown
  // but cannot be opened.
  it('shows the abandoned date instead of a finish date for a DNF read, not editable', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(
        buildEngagement({
          status: ReadingStatus.dnf,
          finished_on: null,
          abandoned_on: '2025-02-04',
        })
      )
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    const abandoned = await screen.findByRole('button', { name: 'Edit abandon date' });
    expect(abandoned).toHaveTextContent('Feb 4, 2025');
    expect(abandoned).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Edit finish date' })).not.toBeInTheDocument();
  });

  it('shows a dash for a date that is not set yet', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(
        buildEngagement({
          status: ReadingStatus.reading,
          started_on: null,
          finished_on: null,
        })
      )
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('button', { name: 'Edit start date' })).toHaveTextContent('—');
    expect(screen.getByRole('button', { name: 'Edit finish date' })).toHaveTextContent('—');
  });

  it('patches the engagement with a date that was edited in the header', async () => {
    const sent: Record<string, unknown>[] = [];
    server.use(
      getEngagementsGetEngagementMockHandler(buildEngagement()),
      http.patch('*/api/engagements/*/dates', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({});
      })
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit finish date' }));
    await userEvent.clear(screen.getByLabelText('finish date'));
    await userEvent.type(screen.getByLabelText('finish date'), '2025-03-14');
    await userEvent.click(screen.getByRole('button', { name: 'Save finish date' }));

    await waitFor(() => expect(sent).toEqual([{ finished_on: '2025-03-14' }]));
  });

  it('shows the length of a page-measured read', async () => {
    server.use(getEngagementsGetEngagementMockHandler(buildEngagement({ length_pages: 272 })));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('button', { name: 'Edit length' })).toHaveTextContent('272');
  });

  it('shows the length of an audio read as a duration', async () => {
    server.use(getEngagementsGetEngagementMockHandler(buildAudioEngagement()));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('button', { name: 'Edit length' })).toHaveTextContent('10:00');
  });

  it('patches the length in pages for a page-measured read', async () => {
    const sent: Record<string, unknown>[] = [];
    server.use(
      getEngagementsGetEngagementMockHandler(buildEngagement()),
      http.patch('*/api/engagements/*/length', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({});
      })
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), '300');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    await waitFor(() => expect(sent).toEqual([{ length_pages: 300 }]));
  });

  it('patches the length in minutes for an audio read', async () => {
    const sent: Record<string, unknown>[] = [];
    server.use(
      getEngagementsGetEngagementMockHandler(buildAudioEngagement()),
      http.patch('*/api/engagements/*/length', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({});
      })
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit length' }));
    await userEvent.type(screen.getByLabelText('length'), '0930');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    await waitFor(() => expect(sent).toEqual([{ length_minutes: 570 }]));
  });

  it('surfaces a length the server refuses', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(buildEngagement()),
      http.patch('*/api/engagements/*/length', () =>
        HttpResponse.json(
          {
            detail:
              'That is shorter than the furthest point logged (page 500). Edit those entries first.',
          },
          { status: 409 }
        )
      )
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That is shorter than the furthest point logged (page 500). Edit those entries first.'
    );
  });

  it('offers logging on a read that is in progress', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(buildEngagement({ status: ReadingStatus.reading }))
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Log progress' }));

    expect(await screen.findByRole('dialog')).toBeVisible();
  });

  it('does not offer logging on a finished read', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(buildEngagement({ status: ReadingStatus.finished }))
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('heading', { name: 'Piranesi' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Log progress' })).not.toBeInTheDocument();
  });

  it('renders one icon per bound format', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(
        buildEngagement({ formats: [Format.print, Format.audio] })
      )
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByText('Print')).toBeVisible();
    expect(screen.getByText('Audio')).toBeVisible();
  });

  it.each([
    [ReadingStatus.reading, 'Currently reading', '/home'],
    [ReadingStatus.finished, 'Finished', '/library/finished'],
    [ReadingStatus.dnf, 'DNF', '/library/dnf'],
  ])('links a %s read back to where it is shelved', async (status, label, href) => {
    server.use(getEngagementsGetEngagementMockHandler(buildEngagement({ status })));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  it('shows a pending state while the read loads', () => {
    server.use(getEngagementsGetEngagementMockHandler(buildEngagement()));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
