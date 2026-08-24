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
  Format,
  LogUnit,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { fireEvent, render, screen, waitFor } from '@/test/render';
import {
  buildAudioEngagement,
  buildEngagement as buildBaseEngagement,
} from '@/test/data-generators';
import { localIsoDate } from '@/utils/local-date';
import { ProgressLogSheet } from './progress-log-sheet';

// Logging progress only happens against an in-progress read, so these start from one
// rather than the shared generator's finished default.
function buildEngagement(overrides: Partial<EngagementRead> = {}): EngagementRead {
  return buildBaseEngagement({
    id: 'engagement-1',
    status: ReadingStatus.reading,
    finished_on: null,
    resume_from_page: 100,
    completion_pct: 52,
    ...overrides,
  });
}

// A read bound in both rulers. The frontier is shared, so the two resume points are one
// position in two units: page 100 of 272 is minute 221 of 600.
function buildMixedEngagement(overrides: Partial<EngagementRead> = {}): EngagementRead {
  return buildEngagement({
    formats: [Format.print, Format.audio],
    resume_from_page: 100,
    resume_from_minute: 221,
    length_minutes: 600,
    ...overrides,
  });
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

  it('opens the start position as a value rather than a field', async () => {
    renderSheet(buildEngagement());

    expect(await screen.findByRole('button', { name: 'Edit start position' })).toHaveTextContent(
      '100'
    );
    expect(screen.queryByLabelText('start position')).not.toBeInTheDocument();
  });

  it('opens the start position for editing prefilled with where the read resumes', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Edit start position' }));

    expect(screen.getByLabelText('start position')).toHaveValue('100');
  });

  it('edits the start position in HH:MM on an audio read', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.click(await screen.findByRole('button', { name: 'Edit start position' }));

    expect(screen.getByLabelText('start position')).toHaveValue('01:15');
  });

  // The catch-up pass the whole feature exists for: a stretch read behind the frontier,
  // which only the start position can express.
  it('saves a session that starts behind where the read has got to', async () => {
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

    await user.click(await screen.findByRole('button', { name: 'Edit start position' }));
    await user.clear(screen.getByLabelText('start position'));
    await user.type(screen.getByLabelText('start position'), '50');
    await user.type(screen.getByLabelText('To · now'), '75');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({
      page_start: 50,
      page_end: 75,
      logged_on: localIsoDate(),
    });
  });

  it('collapses the start position back to a value once it is a valid one', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Edit start position' }));
    await user.clear(screen.getByLabelText('start position'));
    await user.type(screen.getByLabelText('start position'), '50');
    await user.tab();

    expect(screen.getByRole('button', { name: 'Edit start position' })).toHaveTextContent('50');
    expect(screen.queryByLabelText('start position')).not.toBeInTheDocument();
  });

  // Out-of-order new ground is issue 96's deferred half, so the backend 409s a start past
  // the frontier. The sheet refuses it first, and stays open on what was typed.
  it('refuses a start past where the read has got to', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.click(await screen.findByRole('button', { name: 'Edit start position' }));
    await user.clear(screen.getByLabelText('start position'));
    await user.type(screen.getByLabelText('start position'), '150');
    await user.tab();

    expect(screen.getByText("Can't start past page 100")).toBeVisible();
    expect(screen.getByLabelText('start position')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save progress for Piranesi' })).toBeDisabled();
  });

  it('refuses a start past the audio frontier in HH:MM', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.click(await screen.findByRole('button', { name: 'Edit start position' }));
    await user.clear(screen.getByLabelText('start position'));
    await user.type(screen.getByLabelText('start position'), '02:00');
    await user.tab();

    expect(screen.getByText("Can't start past 01:15")).toBeVisible();
  });

  it('re-seeds the start position from the ruler switched to', async () => {
    const user = userEvent.setup();
    renderSheet(buildMixedEngagement({ resume_unit: LogUnit.minutes }));

    await user.click(await screen.findByRole('button', { name: 'Edit start position' }));
    await user.clear(screen.getByLabelText('start position'));
    await user.type(screen.getByLabelText('start position'), '02:00');
    await user.click(screen.getByRole('button', { name: 'Pages' }));

    expect(screen.getByRole('button', { name: 'Edit start position' })).toHaveTextContent('100');
  });

  it('shows the resume minute as From, with the HH:MM field opening empty for an audio engagement', async () => {
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    expect(await screen.findByText('01:15', { exact: true })).toBeVisible();
    expect(screen.getByPlaceholderText('--:--')).toHaveValue('');
    expect(screen.queryByPlaceholderText('---')).not.toBeInTheDocument();
  });

  it('offers no unit switch on a read bound in a single format', async () => {
    renderSheet(buildEngagement());

    expect(await screen.findByPlaceholderText('---')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Pages' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minutes' })).not.toBeInTheDocument();
  });

  it('opens a mixed read on the unit its last entry was logged in', async () => {
    renderSheet(buildMixedEngagement({ resume_unit: LogUnit.minutes }));

    expect(await screen.findByText('03:41', { exact: true })).toBeVisible();
    expect(screen.getByPlaceholderText('--:--')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Minutes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a mixed read on pages when nothing has been logged yet', async () => {
    renderSheet(buildMixedEngagement({ resume_unit: null, resume_from_page: 0 }));

    expect(await screen.findByPlaceholderText('---')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pages' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the shared frontier in the other unit when the unit is switched', async () => {
    const user = userEvent.setup();
    renderSheet(buildMixedEngagement({ resume_unit: LogUnit.minutes }));

    await user.click(await screen.findByRole('button', { name: 'Pages' }));

    expect(screen.getByText('100', { exact: true })).toBeVisible();
    expect(screen.getByPlaceholderText('---')).toHaveValue('');
    expect(screen.queryByPlaceholderText('--:--')).not.toBeInTheDocument();
  });

  it('clears a position typed on the ruler being switched away from', async () => {
    const user = userEvent.setup();
    renderSheet(buildMixedEngagement());

    await user.type(await screen.findByPlaceholderText('---'), '150');
    await user.click(screen.getByRole('button', { name: 'Minutes' }));

    expect(screen.getByPlaceholderText('--:--')).toHaveValue('');
  });

  it('saves minutes once a mixed read is switched to the minute ruler', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      getEngagementsLogProgressMockHandler(async (info) => {
        capturedBody = await info.request.json();
        return getEngagementsLogProgressResponseMock();
      }),
      getEngagementsGetEngagementMockHandler()
    );
    renderSheet(buildMixedEngagement());

    await user.click(await screen.findByRole('button', { name: 'Minutes' }));
    await user.type(screen.getByPlaceholderText('--:--'), '04:30');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({
      minute_start: 221,
      minute_end: 270,
      logged_on: localIsoDate(),
    });
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
    expect(capturedBody).toEqual({
      page_start: 100,
      page_end: 200,
      logged_on: localIsoDate(),
    });
  });

  it('disables Save for the same page as the current position with no note', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement({ resume_from_page: 100 }));

    await user.type(await screen.findByPlaceholderText('---'), '100');
    await user.tab();

    expect(screen.getByText('Add a note, or advance past page 100')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save progress for Piranesi' })).toBeDisabled();
  });

  it('allows saving the same page as the current position when a note is typed', async () => {
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
    await user.click(screen.getByRole('button', { name: '+ Add a note' }));
    await user.type(screen.getByLabelText('Note'), 'A striking quote.');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({
      page_start: 100,
      page_end: 100,
      logged_on: localIsoDate(),
      note: 'A striking quote.',
    });
  });

  it('sends the typed note alongside a page that actually advances', async () => {
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
    await user.click(screen.getByRole('button', { name: '+ Add a note' }));
    await user.type(screen.getByLabelText('Note'), 'A striking quote.');
    await user.click(screen.getByRole('button', { name: 'Save progress for Piranesi' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capturedBody).toEqual({
      page_start: 100,
      page_end: 200,
      logged_on: localIsoDate(),
      note: 'A striking quote.',
    });
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
    expect(capturedBody).toEqual({
      page_start: 100,
      page_end: 200,
      logged_on: localIsoDate(-1),
    });
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
    expect(capturedBody).toEqual({
      page_start: 100,
      page_end: 200,
      logged_on: '2025-06-15',
    });
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
    expect(capturedBody).toEqual({
      minute_start: 75,
      minute_end: 150,
      logged_on: localIsoDate(),
    });
  });

  it('rejects a page that is not a number', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.type(await screen.findByPlaceholderText('---'), 'soon');
    await user.tab();

    expect(screen.getByText('Enter a number')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save progress for Piranesi' })).toBeDisabled();
  });

  it('rejects a page before the one the session started on', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement({ resume_from_page: 100 }));

    await user.type(await screen.findByPlaceholderText('---'), '50');
    await user.tab();

    expect(screen.getByText("Can't end before the session started")).toBeVisible();
  });

  it('rejects a page past the end of the book', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await user.type(await screen.findByPlaceholderText('---'), '300');
    await user.tab();

    expect(screen.getByText('Cannot exceed 272 pages')).toBeVisible();
  });

  // The book default is the last link of the ADR-0021 length chain. A read that
  // overrode it caps against its own length, not the book's.
  it('caps against the read’s own length rather than the book default', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement({ length_pages: 1000 }));

    await user.type(await screen.findByPlaceholderText('---'), '1050');
    await user.tab();

    expect(screen.getByText('Cannot exceed 1000 pages')).toBeVisible();
  });

  it('holds the error back until the field is left', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement({ resume_from_page: 100 }));

    await user.type(await screen.findByPlaceholderText('---'), '50');
    expect(screen.queryByText("Can't end before the session started")).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByText("Can't end before the session started")).toBeVisible();
  });

  it('rejects a time that is not HH:MM', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.type(await screen.findByPlaceholderText('--:--'), '00:73');
    await user.tab();

    expect(screen.getByText('Enter a time in HH:MM format')).toBeVisible();
  });

  it('rejects a time before the one the session started on', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.type(await screen.findByPlaceholderText('--:--'), '00:30');
    await user.tab();

    expect(screen.getByText("Can't end before the session started")).toBeVisible();
  });

  it('rejects a time past the end of the audiobook', async () => {
    const user = userEvent.setup();
    renderSheet(buildAudioEngagement({ resume_from_minute: 75 }));

    await user.type(await screen.findByPlaceholderText('--:--'), '11:00');
    await user.tab();

    expect(screen.getByText('Cannot exceed 10:00')).toBeVisible();
  });
});
