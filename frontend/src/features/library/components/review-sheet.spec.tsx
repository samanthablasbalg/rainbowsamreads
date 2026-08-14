import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { getEngagementsListEngagementsQueryKey } from '@/api/generated/engagements/engagements';
import {
  getEngagementsUpsertReviewMockHandler,
  getEngagementsUpsertReviewResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { fireEvent, render, screen, waitFor } from '@/test/render';
import { ReviewSheet } from './review-sheet';

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
    status: ReadingStatus.finished,
    started_on: '2025-01-01',
    finished_on: '2025-02-14',
    abandoned_on: null,
    resume_from_page: 272,
    resume_from_minute: 0,
    completion_pct: 100,
    review: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function ControlledReviewSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(true);
  return <ReviewSheet engagement={engagement} open={open} onOpenChange={setOpen} />;
}

function renderSheet(engagement: EngagementRead) {
  return render(<ControlledReviewSheet engagement={engagement} />);
}

function captureUpsert() {
  const captured: { body?: unknown } = {};
  server.use(
    getEngagementsUpsertReviewMockHandler(async (info) => {
      captured.body = await info.request.json();
      return getEngagementsUpsertReviewResponseMock();
    })
  );
  return captured;
}

function setRating(value: string) {
  fireEvent.change(screen.getByRole('slider', { name: 'Rating' }), { target: { value } });
}

const saveButton = () => screen.getByRole('button', { name: 'Save review for Piranesi' });

describe('ReviewSheet', () => {
  it('opens empty for a read with no review', async () => {
    renderSheet(buildEngagement());

    expect(await screen.findByRole('slider', { name: 'Rating' })).toHaveValue('0');
    expect(screen.getByText('No rating')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveValue('');
  });

  it('seeds the rating and body from an existing review', async () => {
    renderSheet(
      buildEngagement({ review: { rating: '4.25', body: 'Halls and tides, twice over.' } })
    );

    expect(await screen.findByRole('slider', { name: 'Rating' })).toHaveValue('4.25');
    expect(screen.getByText('4.25 out of 5')).toBeVisible();
    expect(screen.getByText('Halls and tides, twice over.')).toBeVisible();
  });

  it('shows an existing body as static text until Edit is clicked', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement({ review: { rating: '4', body: 'Halls and tides.' } }));

    expect(await screen.findByText('Halls and tides.')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit review for Piranesi' }));

    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveValue('Halls and tides.');
    expect(
      screen.queryByRole('button', { name: 'Edit review for Piranesi' })
    ).not.toBeInTheDocument();
  });

  it('opens straight into the editor when a rating has no body', async () => {
    renderSheet(buildEngagement({ review: { rating: '3', body: null } }));

    expect(await screen.findByRole('textbox', { name: 'Review' })).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: 'Edit review for Piranesi' })
    ).not.toBeInTheDocument();
  });

  it('saves the rating and body and closes the sheet', async () => {
    const user = userEvent.setup();
    const captured = captureUpsert();
    renderSheet(buildEngagement());

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('4.25');
    await user.type(screen.getByRole('textbox', { name: 'Review' }), 'Halls and tides.');
    await user.click(saveButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(captured.body).toEqual({ rating: 4.25, body: 'Halls and tides.' });
  });

  it('sends a null rating rather than zero when no star is set', async () => {
    const user = userEvent.setup();
    const captured = captureUpsert();
    renderSheet(buildEngagement());

    await user.type(
      await screen.findByRole('textbox', { name: 'Review' }),
      'Not sure how I feel yet.'
    );
    await user.click(saveButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(captured.body).toEqual({ rating: null, body: 'Not sure how I feel yet.' });
  });

  it('clears an existing rating when it is dragged back to zero', async () => {
    const user = userEvent.setup();
    const captured = captureUpsert();
    renderSheet(buildEngagement({ review: { rating: '4.25', body: null } }));

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('0');
    await user.click(saveButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(captured.body).toEqual({ rating: null, body: null });
  });

  it('sends a null body rather than an empty string when only a rating is set', async () => {
    const user = userEvent.setup();
    const captured = captureUpsert();
    renderSheet(buildEngagement());

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('5');
    await user.click(saveButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(captured.body).toEqual({ rating: 5, body: null });
  });

  it('trims surrounding whitespace off the body', async () => {
    const user = userEvent.setup();
    const captured = captureUpsert();
    renderSheet(buildEngagement());

    await user.type(
      await screen.findByRole('textbox', { name: 'Review' }),
      '   Halls and tides.   '
    );
    await user.click(saveButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(captured.body).toEqual({ rating: null, body: 'Halls and tides.' });
  });

  it('treats a whitespace-only body as no body', async () => {
    const user = userEvent.setup();
    const captured = captureUpsert();
    renderSheet(buildEngagement());

    await user.type(await screen.findByRole('textbox', { name: 'Review' }), '   ');
    await user.click(saveButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(captured.body).toEqual({ rating: null, body: null });
  });

  it('saves the edited body when an existing review is changed', async () => {
    const user = userEvent.setup();
    const captured = captureUpsert();
    renderSheet(buildEngagement({ review: { rating: '4', body: 'First thoughts.' } }));

    await user.click(await screen.findByRole('button', { name: 'Edit review for Piranesi' }));
    await user.clear(screen.getByRole('textbox', { name: 'Review' }));
    await user.type(screen.getByRole('textbox', { name: 'Review' }), 'Second thoughts.');
    await user.click(saveButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(captured.body).toEqual({ rating: 4, body: 'Second thoughts.' });
  });

  it('invalidates the engagement lists so the new rating reaches the shelf', async () => {
    const user = userEvent.setup();
    server.use(getEngagementsUpsertReviewMockHandler());
    const { queryClient } = renderSheet(buildEngagement());
    const listQueryKey = getEngagementsListEngagementsQueryKey({ status: ReadingStatus.finished });
    queryClient.setQueryData(listQueryKey, []);

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('5');
    await user.click(saveButton());

    await waitFor(() => expect(queryClient.getQueryState(listQueryKey)?.isInvalidated).toBe(true));
  });

  it('disables both buttons and shows the Save spinner while a save is in flight', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      getEngagementsUpsertReviewMockHandler(async () => {
        await held;
        return getEngagementsUpsertReviewResponseMock();
      })
    );
    renderSheet(buildEngagement());

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('4');
    const save = saveButton();
    await user.click(save);

    expect(save).toBeDisabled();
    expect(save).toHaveTextContent('Saving…');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    release();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the backend detail message and keeps the sheet open on failure', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('*/api/engagements/:engagementId/review', () =>
        HttpResponse.json({ detail: 'Rating must be in 0.25 increments' }, { status: 422 })
      )
    );
    renderSheet(buildEngagement());

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('4');
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Rating must be in 0.25 increments');
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('falls back to a generic message when a save error has no detail', async () => {
    const user = userEvent.setup();
    server.use(
      http.put(
        '*/api/engagements/:engagementId/review',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    renderSheet(buildEngagement());

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('4');
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save. Please try again.');
  });

  it('closes without saving when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderSheet(buildEngagement());

    await screen.findByRole('slider', { name: 'Rating' });
    setRating('4');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
