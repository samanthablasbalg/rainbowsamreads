import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { getEngagementsListEngagementsQueryKey } from '@/api/generated/engagements/engagements';
import {
  getEngagementsGetEngagementMockHandler,
  getEngagementsLogProgressMockHandler,
  getEngagementsLogProgressResponseMock,
  getEngagementsUpdateEngagementStatusMockHandler,
  getEngagementsUpdateEngagementStatusResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { fireEvent, render, screen, waitFor } from '@/test/render';
import { todayIsoDate } from '../utils/local-date';
import { ProgressLogSheet } from './progress-log-sheet';

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
    resume_from_page: 100,
    resume_from_minute: 0,
    completion_pct: 52,
    review: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ProgressLogSheet is controlled (open/onOpenChange), the same way ReadingCard will
// drive it -- there's no defaultOpen prop to render it pre-opened on its own.
function ControlledProgressLogSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(true);
  return <ProgressLogSheet engagement={engagement} open={open} onOpenChange={setOpen} />;
}

function renderSheet(engagement: EngagementRead) {
  return render(<ControlledProgressLogSheet engagement={engagement} />);
}

// Lets a test hold a mock response open so it can assert on the pending state before
// letting it resolve, the same way MSW's own docs recommend for in-flight assertions.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('ProgressLogSheet', () => {
  it('shows the resume page as From, with the To field opening empty and Save disabled', async () => {
    renderSheet(buildEngagement());

    expect(await screen.findByText('100', { exact: true })).toBeVisible();
    expect(screen.getByPlaceholderText('---')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save progress for Piranesi' })).toBeDisabled();
  });

  it('shows the resume minute as From, with the HH:MM field opening empty for an audio engagement', async () => {
    renderSheet(buildEngagement({ formats: [Format.audio], resume_from_minute: 75 }));

    expect(await screen.findByText('01:15', { exact: true })).toBeVisible();
    expect(screen.getByPlaceholderText('--:--')).toHaveValue('');
    expect(screen.queryByPlaceholderText('---')).not.toBeInTheDocument();
  });

  it("saves the entered page with today's date and closes the sheet", async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      getEngagementsLogProgressMockHandler(async (info) => {
        capturedBody = await info.request.json();
        return getEngagementsLogProgressResponseMock();
      }),
      getEngagementsGetEngagementMockHandler()
    );
    renderSheet(buildEngagement());

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ current_page: 200, logged_on: todayIsoDate() });
  });

  it('allows saving the same page as the current position', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      getEngagementsLogProgressMockHandler(async (info) => {
        capturedBody = await info.request.json();
        return getEngagementsLogProgressResponseMock();
      }),
      getEngagementsGetEngagementMockHandler()
    );
    renderSheet(buildEngagement({ resume_from_page: 100 }));

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '100');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ current_page: 100, logged_on: todayIsoDate() });
  });

  it('sends the chosen date when logging for a different day', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      getEngagementsLogProgressMockHandler(async (info) => {
        capturedBody = await info.request.json();
        return getEngagementsLogProgressResponseMock();
      }),
      getEngagementsGetEngagementMockHandler()
    );
    renderSheet(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'Log for a different day' }));
    // fireEvent.change, not userEvent.type: jsdom's native <input type="date"> doesn't
    // support typed keystrokes the way a real browser's segmented date picker does.
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: '2025-06-15' } });
    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ current_page: 200, logged_on: '2025-06-15' });
  });

  // Regression test for a real bug: the reading list is ordered by most-recent
  // activity (backend), so invalidating and refetching it after a save would jump
  // the saved book to the top mid-interaction. The cache must be patched in place.
  it('patches the saved engagement into the reading list cache without reordering it', async () => {
    const user = userEvent.setup();
    const engagement = buildEngagement();
    const otherEngagement = buildEngagement({
      id: 'engagement-2',
      book: { ...engagement.book, id: 'book-2', title: 'Other Book' },
    });
    const updatedEngagement: EngagementRead = {
      ...engagement,
      resume_from_page: 200,
      completion_pct: 74,
    };
    server.use(
      getEngagementsLogProgressMockHandler(),
      getEngagementsGetEngagementMockHandler(updatedEngagement)
    );
    const { queryClient } = render(<ControlledProgressLogSheet engagement={engagement} />);
    const listQueryKey = getEngagementsListEngagementsQueryKey({ status: ReadingStatus.reading });
    queryClient.setQueryData(listQueryKey, [engagement, otherEngagement]);

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(queryClient.getQueryData(listQueryKey)).toEqual([updatedEngagement, otherEngagement]);
  });

  it('shows a plain confirmation on finish, and confirms on the second click', async () => {
    const user = userEvent.setup();
    server.use(getEngagementsUpdateEngagementStatusMockHandler());
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'I finished the book' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Mark "Piranesi" as finished?');

    await user.click(screen.getByRole('button', { name: 'I finished the book' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('warns the entered page will be discarded when finishing after an edit', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'I finished the book' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Finish and discard the page you entered');
  });

  it('asks to confirm giving up, and confirms on the second click', async () => {
    const user = userEvent.setup();
    server.use(getEngagementsUpdateEngagementStatusMockHandler());
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Give up (DNF)' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Give up on "Piranesi"?');

    await user.click(screen.getByRole('button', { name: 'Give up (DNF)' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('disables every button and shows the Save spinner while a save is in flight', async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<void>();
    server.use(
      getEngagementsLogProgressMockHandler(async () => {
        await promise;
        return getEngagementsLogProgressResponseMock();
      }),
      getEngagementsGetEngagementMockHandler()
    );
    renderSheet(buildEngagement());

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    const saveButton = screen.getByRole('button', { name: 'Save progress for Piranesi' });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent('Saving…');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'I finished the book' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Give up (DNF)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Log for a different day' })).toBeDisabled();

    resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('disables every button and shows the Finish spinner while finishing is in flight', async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<void>();
    server.use(
      getEngagementsUpdateEngagementStatusMockHandler(async () => {
        await promise;
        return getEngagementsUpdateEngagementStatusResponseMock();
      })
    );
    renderSheet(buildEngagement());

    const finishButton = await screen.findByRole('button', { name: 'I finished the book' });
    await user.click(finishButton);
    await user.click(finishButton);

    expect(finishButton).toBeDisabled();
    expect(finishButton).toHaveTextContent('Finishing…');
    expect(screen.getByRole('button', { name: 'Give up (DNF)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save progress for Piranesi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('disables every button and shows the Give up spinner while giving up is in flight', async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<void>();
    server.use(
      getEngagementsUpdateEngagementStatusMockHandler(async () => {
        await promise;
        return getEngagementsUpdateEngagementStatusResponseMock();
      })
    );
    renderSheet(buildEngagement());

    const giveUpButton = await screen.findByRole('button', { name: 'Give up (DNF)' });
    await user.click(giveUpButton);
    await user.click(giveUpButton);

    expect(giveUpButton).toBeDisabled();
    expect(giveUpButton).toHaveTextContent('Giving up…');
    expect(screen.getByRole('button', { name: 'I finished the book' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save progress for Piranesi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the backend detail message and keeps the sheet open on save failure', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/api/engagements/:engagementId/progress-logs', () =>
        HttpResponse.json({ detail: 'A log already exists on a later day.' }, { status: 409 })
      )
    );
    renderSheet(buildEngagement());

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A log already exists on a later day.'
    );
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('falls back to a generic message when a save error has no detail', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(
        '*/api/engagements/:engagementId/progress-logs',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    renderSheet(buildEngagement());

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save. Please try again.');
  });

  it('clears a stale save error once the position is edited again', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(
        '*/api/engagements/:engagementId/progress-logs',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    renderSheet(buildEngagement());

    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));
    expect(await screen.findByRole('alert')).toBeVisible();

    await user.type(positionInput, '5');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the backend detail message and drops back to idle on finish failure', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch('*/api/engagements/:engagementId', () =>
        HttpResponse.json(
          { detail: 'Already reading another engagement for this book.' },
          { status: 409 }
        )
      )
    );
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'I finished the book' }));
    await user.click(screen.getByRole('button', { name: 'I finished the book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Already reading another engagement for this book.'
    );
    expect(screen.getByRole('button', { name: 'I finished the book' })).toBeVisible();
  });

  it('falls back to a generic message when a DNF error has no detail', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch('*/api/engagements/:engagementId', () => new HttpResponse(null, { status: 500 }))
    );
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Give up (DNF)' }));
    await user.click(screen.getByRole('button', { name: 'Give up (DNF)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to DNF. Please try again.');
  });

  // No MSW handler registered for this one -- the suite's onUnhandledRequest: 'error'
  // means a mutation firing anyway would fail the test, not just an assertion missing.
  it('closes without saving when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
