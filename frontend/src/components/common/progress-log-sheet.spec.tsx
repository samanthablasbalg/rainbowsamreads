import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { getEngagementsListEngagementsQueryKey } from '@/api/generated/engagements/engagements';
import {
  getEngagementsGetEngagementMockHandler,
  getEngagementsLogProgressMockHandler,
  getEngagementsLogProgressResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { fireEvent, render, screen, waitFor } from '@/test/render';
import { buildAudioEngagement } from '@/test/data-generators';
import { localIsoDate } from '@/utils/local-date';
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

function ControlledProgressLogSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(true);
  return <ProgressLogSheet engagement={engagement} open={open} onOpenChange={setOpen} />;
}

function renderSheet(engagement: EngagementRead) {
  return render(<ControlledProgressLogSheet engagement={engagement} />);
}

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
    expect(capturedBody).toEqual({ current_page: 200, logged_on: localIsoDate() });
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
    expect(capturedBody).toEqual({ current_page: 100, logged_on: localIsoDate() });
  });

  it("sends yesterday's date when the Yesterday chip is picked", async () => {
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

    await user.click(await screen.findByRole('button', { name: 'Yesterday' }));
    const positionInput = screen.getByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ current_page: 200, logged_on: localIsoDate(-1) });
  });

  it('selects the Yesterday chip when the Yesterday chip is picked', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Yesterday' }));

    expect(screen.getByRole('button', { name: 'Yesterday' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Pick a date' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('deselects Today as soon as the date editor is opened', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Pick a date' }));

    expect(screen.getByRole('button', { name: 'Pick a date' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Yesterday' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('leaves the Yesterday chip unselected when yesterday is chosen in the calendar', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Pick a date' }));
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: localIsoDate(-1) } });

    expect(screen.getByRole('button', { name: 'Yesterday' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Pick a date' })).not.toBeInTheDocument();
  });

  it('labels the calendar chip with a date that is neither today nor yesterday', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Pick a date' }));
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: '2025-06-15' } });

    expect(screen.getByRole('button', { name: 'Jun 15' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Pick a date' })).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Pick a date' }));
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: '2025-06-15' } });
    const positionInput = await screen.findByPlaceholderText('---');
    await user.type(positionInput, '200');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ current_page: 200, logged_on: '2025-06-15' });
  });

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
    expect(screen.getByRole('button', { name: 'Pick a date' })).toBeDisabled();

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

  it('closes without saving when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves an audio position as minutes, not as the HH:MM that was typed', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      getEngagementsLogProgressMockHandler(async (info) => {
        capturedBody = await info.request.json();
        return getEngagementsLogProgressResponseMock();
      }),
      getEngagementsGetEngagementMockHandler()
    );
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.type(await screen.findByPlaceholderText('--:--'), '02:30');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({ current_minute: 150, logged_on: localIsoDate() });
  });

  it('rejects a page that is not a number', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.type(await screen.findByPlaceholderText('---'), 'soon');
    await user.tab();

    expect(screen.getByText('Enter a number')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save progress for Piranesi' })).toBeDisabled();
  });

  it('rejects a page before the one the read resumes from', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement({ resume_from_page: 100 }));

    await user.type(await screen.findByPlaceholderText('---'), '50');
    await user.tab();

    expect(screen.getByText("Can't be before page 100")).toBeVisible();
  });

  it('rejects a page past the end of the book', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.type(await screen.findByPlaceholderText('---'), '300');
    await user.tab();

    expect(screen.getByText('Cannot exceed 272 pages')).toBeVisible();
  });

  it('holds the error back until the field is left', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement({ resume_from_page: 100 }));

    await user.type(await screen.findByPlaceholderText('---'), '50');
    expect(screen.queryByText("Can't be before page 100")).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByText("Can't be before page 100")).toBeVisible();
  });

  it('rejects a time that is not HH:MM', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.type(await screen.findByPlaceholderText('--:--'), '00:73');
    await user.tab();

    expect(screen.getByText('Enter a time in HH:MM format')).toBeVisible();
  });

  it('rejects a time before the one the read resumes from', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.type(await screen.findByPlaceholderText('--:--'), '00:30');
    await user.tab();

    expect(screen.getByText("Can't be before 01:15")).toBeVisible();
  });

  it('rejects a time past the end of the audiobook', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.type(await screen.findByPlaceholderText('--:--'), '11:00');
    await user.tab();

    expect(screen.getByText('Cannot exceed 10:00')).toBeVisible();
  });
});
