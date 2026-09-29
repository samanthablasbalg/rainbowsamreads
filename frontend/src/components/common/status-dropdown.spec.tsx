import userEvent from '@testing-library/user-event';
import {
  getBooksGetBookMockHandler,
  getBooksListBookEngagementsMockHandler,
} from '@/api/generated/books/books.msw';
import {
  getEngagementsWriteEngagementMockHandler,
  getEngagementsWriteEngagementResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { fireEvent, render, screen, waitFor } from '@/test/render';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { StatusDropdown } from './status-dropdown';

function renderDropdown(engagement: EngagementRead | null) {
  const captured: { body?: unknown } = {};
  const book = buildBook();
  server.use(
    getBooksGetBookMockHandler(book),
    getBooksListBookEngagementsMockHandler(engagement ? [engagement] : []),
    getEngagementsWriteEngagementMockHandler(async (info) => {
      captured.body = await info.request.json();
      return getEngagementsWriteEngagementResponseMock();
    })
  );
  render(<StatusDropdown book={book} engagement={engagement} />);
  return captured;
}

describe('StatusDropdown', () => {
  it('shows all statuses when a book is Not Tracked', async () => {
    const user = userEvent.setup();

    render(<StatusDropdown book={buildBook()} engagement={null} />);

    await user.click(await screen.findByRole('button', { name: /Not tracked/ }));

    expect(await screen.findByRole('menuitem', { name: 'Reading' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Finished' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'DNF' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'To read' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'Paused' })).not.toBeInTheDocument();
  });

  it('shows all statuses when a book has an engagement', async () => {
    const user = userEvent.setup();

    render(<StatusDropdown book={buildBook()} engagement={buildEngagement()} />);

    await user.click(await screen.findByRole('button', { name: /Finished/ }));

    expect(screen.queryByRole('menuitem', { name: 'Not tracked' })).not.toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: 'Reading' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Finished' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'DNF' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'To read' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'Paused' })).not.toBeInTheDocument();
  });

  describe('transition from Not tracked', () => {
    let captured: { body?: unknown };
    beforeEach(() => {
      captured = renderDropdown(null);
    });
    it('moves a read to TBR', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Not tracked/ }));
      await user.click(await screen.findByRole('menuitem', { name: /To read/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          book_id: 'book-Piranesi',
          status: 'tbr',
        })
      );
    });

    const cases = [
      { status: ReadingStatus.reading, label: 'Reading' },
      { status: ReadingStatus.finished, label: 'Finished' },
      { status: ReadingStatus.dnf, label: 'DNF' },
    ];
    it.each(cases)('moves a read to $label', async ({ status, label }) => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Not tracked/ }));
      await user.click(await screen.findByRole('menuitem', { name: label }));
      await user.click(await screen.findByRole('button', { name: /Piranesi/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          book_id: 'book-Piranesi',
          status: status,
        })
      );
    });
  });

  describe('transition from TBR', () => {
    let captured: { body?: unknown };
    beforeEach(() => {
      captured = renderDropdown(buildEngagement({ id: 'engagement-1', status: ReadingStatus.tbr }));
    });
    const cases = [
      { status: ReadingStatus.reading, label: 'Reading' },
      { status: ReadingStatus.finished, label: 'Finished' },
    ];
    it.each(cases)('moves a read to $label', async ({ status, label }) => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /To read/ }));
      await user.click(await screen.findByRole('menuitem', { name: label }));
      fireEvent.change(await screen.findByLabelText(/date/), {
        target: { value: '2025-06-15' },
      });
      await user.click(await screen.findByRole('button', { name: /Piranesi/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          id: 'engagement-1',
          status: status,
          effective_on: '2025-06-15',
        })
      );
    });

    it('moves a read to DNF', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /To read/ }));
      await user.click(await screen.findByRole('menuitem', { name: 'DNF' }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          id: 'engagement-1',
          status: 'dnf',
        })
      );
    });
  });

  describe('transition from Reading', () => {
    let captured: { body?: unknown };
    beforeEach(() => {
      captured = renderDropdown(
        buildEngagement({ id: 'engagement-1', status: ReadingStatus.reading })
      );
    });

    it('moves a read without progress logs back to TBR', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Reading/ }));
      await user.click(await screen.findByRole('menuitem', { name: /To read/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          id: 'engagement-1',
          status: 'tbr',
        })
      );
    });

    it.skip('does not moves a read with progress logs back to TBR', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Reading/ }));
      await user.click(await screen.findByRole('menuitem', { name: /To read/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          id: 'engagement-1',
          status: 'tbr',
        })
      );
    });

    it('moves a read to Finished with its date', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Reading/ }));
      await user.click(await screen.findByRole('menuitem', { name: /Finished/ }));
      fireEvent.change(await screen.findByLabelText(/date/), {
        target: { value: '2025-06-15' },
      });
      await user.click(await screen.findByRole('button', { name: /Piranesi/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          id: 'engagement-1',
          status: 'finished',
          effective_on: '2025-06-15',
        })
      );
    });

    it('moves a read to DNF', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Reading/ }));
      await user.click(await screen.findByRole('menuitem', { name: 'DNF' }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          id: 'engagement-1',
          status: 'dnf',
        })
      );
    });
  });

  describe('transition from Finished', () => {
    let captured: { body?: unknown };
    beforeEach(() => {
      captured = renderDropdown(
        buildEngagement({ id: 'engagement-1', status: ReadingStatus.finished })
      );
    });

    it('starts a new read in TBR', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Finished/ }));
      await user.click(await screen.findByRole('menuitem', { name: /To read/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          book_id: 'book-Piranesi',
          status: 'tbr',
        })
      );
    });

    it.each([
      {
        status: ReadingStatus.reading,
        label: 'Reading',
        dateLabel: 'Start date',
        dateField: 'started_on',
      },
      {
        status: ReadingStatus.dnf,
        label: 'DNF',
        dateLabel: 'Stopped on',
        dateField: 'abandoned_on',
      },
    ])('starts a new read as $label', async ({ status, dateLabel, label, dateField }) => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /Finished/ }));
      await user.click(await screen.findByRole('menuitem', { name: label }));
      fireEvent.change(await screen.findByLabelText(dateLabel), {
        target: { value: '2025-06-15' },
      });
      await user.click(await screen.findByRole('button', { name: /Piranesi/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          book_id: 'book-Piranesi',
          status,
          [dateField]: '2025-06-15',
        })
      );
    });
  });

  describe('transition from DNF', () => {
    let captured: { body?: unknown };
    beforeEach(() => {
      captured = renderDropdown(buildEngagement({ id: 'engagement-1', status: ReadingStatus.dnf }));
    });

    it('starts a new read in TBR', async () => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /DNF/ }));
      await user.click(await screen.findByRole('menuitem', { name: /To read/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          book_id: 'book-Piranesi',
          status: 'tbr',
        })
      );
    });

    it.each([
      {
        status: ReadingStatus.reading,
        label: 'Reading',
        dateLabel: 'Start date',
        dateField: 'started_on',
      },
      {
        status: ReadingStatus.finished,
        label: 'Finished',
        dateLabel: 'Finish date',
        dateField: 'finished_on',
      },
    ])('starts a new read as $label', async ({ status, dateLabel, label, dateField }) => {
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: /DNF/ }));
      await user.click(await screen.findByRole('menuitem', { name: label }));
      fireEvent.change(await screen.findByLabelText(dateLabel), {
        target: { value: '2025-06-15' },
      });
      await user.click(await screen.findByRole('button', { name: /Piranesi/ }));
      await waitFor(() =>
        expect(captured.body).toMatchObject({
          book_id: 'book-Piranesi',
          status,
          [dateField]: '2025-06-15',
        })
      );
    });
  });
});
