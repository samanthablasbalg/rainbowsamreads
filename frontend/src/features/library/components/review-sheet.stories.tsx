import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
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

export const Existing: Story = {
  render: () => <ControlledSheet engagement={reviewed} />,
  play: async (context) => {
    await openSheet(context);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  },
};

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
