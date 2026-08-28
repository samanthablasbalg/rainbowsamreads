import userEvent from '@testing-library/user-event';
import {
  getEngagementsDeleteEngagementMockHandler,
  getEngagementsUpdateEngagementStatusMockHandler,
  getEngagementsUpdateEngagementStatusResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { Format, ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { buildEngagement as buildBaseEngagement } from '@/test/data-generators';
import { localIsoDate } from '@/utils/local-date';
import { ReadingCard } from './reading-card';

function buildEngagement(overrides: Partial<EngagementRead> = {}): EngagementRead {
  return buildBaseEngagement({
    id: 'engagement-1',
    status: ReadingStatus.reading,
    finished_on: null,
    resume_from_page: 0,
    completion_pct: 52,
    ...overrides,
  });
}

function renderInList(engagement: EngagementRead) {
  return render(
    <ul>
      <ReadingCard engagement={engagement} />
    </ul>
  );
}

async function openOverflowMenuAndChoose(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
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

  it('renders one format chip per format the read is bound to', () => {
    renderInList(buildEngagement({ formats: [Format.print, Format.digital, Format.audio] }));

    expect(screen.getByText('Print')).toBeVisible();
    expect(screen.getByText('Digital')).toBeVisible();
    expect(screen.getByText('Audio')).toBeVisible();
  });

  it('renders no format chip when the read has no formats', () => {
    renderInList(buildEngagement({ formats: [] }));

    expect(screen.queryByText(/^(Print|Digital|Audio)$/)).not.toBeInTheDocument();
  });

  it('renders the log-progress and overflow-menu buttons with book-specific labels', () => {
    renderInList(buildEngagement());

    expect(screen.getByRole('button', { name: 'Log progress for Piranesi' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'More actions for Piranesi' })).toBeVisible();
  });

  it('opens the progress-log sheet from the log-progress button', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'Log progress for Piranesi' }));

    expect(await screen.findByRole('dialog', { name: 'Piranesi' })).toBeVisible();
  });

  it('offers history, add-format, finish, DNF and delete from the overflow menu, in that order', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
    await screen.findByRole('menu');

    expect(screen.getAllByRole('menuitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'View history for Piranesi',
      'Add another format to Piranesi',
      'Mark Piranesi as finished',
      'Mark Piranesi as DNF',
      'Delete Piranesi',
    ]);
  });

  it('drops add-format once the read is already in every format', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement({ formats: [Format.print, Format.digital, Format.audio] }));

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
    await screen.findByRole('menu');

    expect(
      screen.queryByRole('menuitem', { name: 'Add another format to Piranesi' })
    ).not.toBeInTheDocument();
  });

  it('opens the add-format sheet from the overflow menu', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Add another format to Piranesi');

    expect(await screen.findByRole('dialog', { name: 'Add another format' })).toHaveTextContent(
      'Piranesi'
    );
  });

  it('links View history at the read’s own page', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement({ id: 'engagement-Piranesi' }));

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));

    expect(
      await screen.findByRole('menuitem', { name: 'View history for Piranesi' })
    ).toHaveAttribute('href', '/reads/engagement-Piranesi');
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

  it('marks the engagement finished, through the finish sheet, when Mark as finished is chosen', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      getEngagementsUpdateEngagementStatusMockHandler(async (info) => {
        capturedBody = await info.request.json();
        return getEngagementsUpdateEngagementStatusResponseMock();
      })
    );
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Mark Piranesi as finished');
    expect(await screen.findByRole('dialog', { name: 'Mark as finished' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Mark Piranesi as finished' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ status: 'finished', effective_on: localIsoDate() });
  });

  it('marks the engagement DNF, after confirming, when Mark as DNF is chosen', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      getEngagementsUpdateEngagementStatusMockHandler(async (info) => {
        capturedBody = await info.request.json();
        return getEngagementsUpdateEngagementStatusResponseMock();
      })
    );
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Mark Piranesi as DNF');
    expect(
      await screen.findByRole('dialog', { name: 'Mark "Piranesi" as did not finish?' })
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Mark as DNF' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ status: 'dnf' });
  });

  it('deletes the engagement, after confirming, when Delete is chosen', async () => {
    const user = userEvent.setup();
    server.use(getEngagementsDeleteEngagementMockHandler());
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Delete Piranesi');
    expect(
      await screen.findByRole('dialog', { name: 'Delete this read of "Piranesi"?' })
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('leaves the engagement unchanged when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Delete Piranesi');
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
