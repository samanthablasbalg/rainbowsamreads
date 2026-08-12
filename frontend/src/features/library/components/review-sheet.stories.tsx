import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/testing/pointer-decorator';
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test';
import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { ReviewSheet } from './review-sheet';

const baseEngagement: EngagementRead = {
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
};

// ReviewSheet is controlled and has no defaultOpen -- the real app only drives it from
// EngagementRow's own open state -- so each story supplies a trigger and opens it through
// `play`.
function ControlledSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <ReviewSheet engagement={engagement} open={open} onOpenChange={setOpen} />
    </>
  );
}

// screen, not `within(canvasElement)`: the content renders through a portal, which lands
// outside the story's own element.
async function openSheet({ canvasElement }: { canvasElement: HTMLElement }) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
}

const meta = {
  play: openSheet,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
};

const reviewed: EngagementRead = {
  ...baseEngagement,
  review: {
    rating: '4.25',
    body: 'A house of infinite halls and tides. I read the last fifty pages twice.',
  },
};

// A quarter rating and a body, which is the state the form re-seeds itself from. 4.25 is
// deliberately not a whole or half star: it is the case the input exists for. Existing
// text opens static, so this is the Edit button's own story too.
export const Existing: Story = {
  render: () => <ControlledSheet engagement={reviewed} />,
  play: async (context) => {
    await openSheet(context);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  },
};

// A rating with no body has nothing to show statically, so it opens straight into the
// editor with no Edit button in the way.
export const RatingOnly: Story = {
  render: () => (
    <ControlledSheet engagement={{ ...reviewed, review: { rating: '3', body: null } }} />
  ),
  play: async (context) => {
    await openSheet(context);
    expect(await screen.findByRole('textbox', { name: 'Review' })).toBeInTheDocument();
  },
};

export const EditingExisting: Story = {
  render: () => <ControlledSheet engagement={reviewed} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: /Edit review/ }));
    expect(await screen.findByRole('textbox', { name: 'Review' })).toHaveValue(
      reviewed.review!.body
    );
  },
};

// A review long enough to overrun the popup. DialogContent sets no max height, so before
// the fields got their own scroll region this pushed Save off the bottom of the screen
// with no way to reach it. The assertion is that the footer is still there; how it looks
// is the point of the story.
export const LongReview: Story = {
  render: () => (
    <ControlledSheet
      engagement={{
        ...reviewed,
        review: {
          rating: '4.75',
          body: Array.from(
            { length: 12 },
            (_, i) =>
              `Paragraph ${i + 1}. A house of infinite halls and tides, statues in every vestibule, and an ocean that keeps its own hours. I read the last fifty pages twice and started again the next morning.`
          ).join('\n\n'),
        },
      }}
    />
  ),
  play: async (context) => {
    await openSheet(context);
    const save = await screen.findByRole('button', { name: /Save review/ });
    // Geometry, not toBeVisible: the bug left Save fully visible by CSS while sitting
    // below the bottom of the screen, which is exactly what that matcher does not check.
    // waitFor because the popup is still fading and settling on its first frames.
    await waitFor(() => {
      const { top, bottom } = save.getBoundingClientRect();
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(window.innerHeight);
    });
  },
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet engagement={baseEngagement} />,
};

// The slider is the whole point of the screen, so one story drives it rather than only
// rendering it.
//
// fireEvent.change, not userEvent's arrow keys: userEvent dispatches untrusted events,
// and a browser runs no default action for those, so a range input's native key handling
// never fires and the value stays put. Same reason progress-log-sheet.stories.tsx sets
// its date input this way. What is being checked here is the wiring either way -- that a
// new value reaches the label and the fill -- not Chromium's own key handling.
export const RatingChanged: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
  play: async (context) => {
    await openSheet(context);
    const slider = await screen.findByRole('slider', { name: 'Rating' });
    expect(await screen.findByText('No rating')).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '3.25' } });
    expect(slider).toHaveValue('3.25');
    expect(await screen.findByText('3.25 out of 5')).toBeInTheDocument();
  },
};
