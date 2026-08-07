import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';
import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { ProgressLogDialogHost, ProgressLogSheetHost } from './progress-log-sheet';

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
  status: ReadingStatus.reading,
  started_on: '2025-01-01',
  finished_on: null,
  abandoned_on: null,
  resume_from_page: 132,
  resume_from_minute: 0,
  completion_pct: 52,
  review: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// Neither host takes a defaultOpen prop -- the real app only ever mounts one via
// ReadingCard's own open state -- so each story supplies its own trigger and opens it
// through `play`, the same shape as account-menu.stories.tsx and sheet.stories.tsx.
function ControlledDialogHost({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <ProgressLogDialogHost engagement={engagement} open={open} onOpenChange={setOpen} />
    </>
  );
}

function ControlledSheetHost({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <ProgressLogSheetHost engagement={engagement} open={open} onOpenChange={setOpen} />
    </>
  );
}

// screen, not `within(canvasElement)`, for the assertion: both hosts render their
// content through a portal, which lands outside the story's own element.
async function openHost({ canvasElement }: { canvasElement: HTMLElement }) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
}

// No `component`: this file covers two hosts (see progress-log-sheet.tsx's own comment
// on why Storybook can't reach ProgressLogSheetHost through the top-level switch),
// not variants of one component. Save behavior is covered by progress-log-sheet.spec.tsx
// -- these stories are for format/host variants and the a11y gate, not a second copy of
// the same interaction assertions.
const meta = {
  play: openHost,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Print: Story = {
  render: () => <ControlledDialogHost engagement={baseEngagement} />,
};

export const Audiobook: Story = {
  render: () => (
    <ControlledDialogHost
      engagement={{
        ...baseEngagement,
        book: { ...baseEngagement.book, title: 'The House in the Cerulean Sea' },
        formats: [Format.audio],
        resume_from_minute: 75,
        completion_pct: 30,
      }}
    />
  ),
};

export const MobileSheet: Story = {
  render: () => <ControlledSheetHost engagement={baseEngagement} />,
};
