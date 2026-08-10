import { http, HttpResponse } from 'msw';
import { getEngagementsGetEngagementMockHandler } from '@/api/generated/engagements/engagements.msw';
import { Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { buildEngagement } from '@/testing/data-generators';
import { ReadHistory } from './read-history';

describe('ReadHistory', () => {
  it('renders the read it was given the id of', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(
        buildEngagement({ status: ReadingStatus.reading, completion_pct: 37 })
      )
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('heading', { name: 'Piranesi' })).toBeVisible();
    expect(screen.getByText('Susanna Clarke')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Format: print' })).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Piranesi progress: 37%');
  });

  // The dates are date-only strings; rendering them in local time would land on the
  // previous calendar day for anyone behind UTC, which is what formatIsoDate's pinned
  // timeZone prevents -- so this guards the day, whatever the machine's clock says. The
  // expected text does assume the runtime's default locale is en-US, which holds in the
  // container the suite runs in (ADR-0028).
  it('shows the start and finish dates of a finished read', async () => {
    server.use(getEngagementsGetEngagementMockHandler(buildEngagement()));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByText('Started Jan 1, 2025 · Finished Mar 12, 2025')).toBeVisible();
  });

  it('shows the abandoned date instead of a finish date for a DNF read', async () => {
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

    expect(await screen.findByText('Started Jan 1, 2025 · Abandoned Feb 4, 2025')).toBeVisible();
  });

  it('omits the dates line for a read with neither date set', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Piranesi' })).toBeVisible();
    expect(screen.queryByText(/^Started/)).not.toBeInTheDocument();
  });

  it('renders one icon per bound format', async () => {
    server.use(
      getEngagementsGetEngagementMockHandler(
        buildEngagement({ formats: [Format.print, Format.audio] })
      )
    );

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('img', { name: 'Format: print' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Format: audio' })).toBeVisible();
  });

  // The link is a real href rather than a history pop, so it works on a cold load of the
  // URL where there is nothing to go back to.
  it('links back to currently reading', async () => {
    server.use(getEngagementsGetEngagementMockHandler(buildEngagement()));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(screen.getByRole('link', { name: 'Currently reading' })).toHaveAttribute(
      'href',
      '/home'
    );
  });

  it('shows a pending state while the read loads', () => {
    server.use(getEngagementsGetEngagementMockHandler(buildEngagement()));

    render(<ReadHistory engagementId="engagement-Piranesi" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('shows an error state when the read fails to load', async () => {
    server.use(http.get('*/api/engagements/*', () => new HttpResponse(null, { status: 404 })));

    render(<ReadHistory engagementId="missing" />);

    expect(await screen.findByRole('alert')).toBeVisible();
  });
});
