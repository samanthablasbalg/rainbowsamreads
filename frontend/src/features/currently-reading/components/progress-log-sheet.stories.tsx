import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type ReactNode } from 'react';
import { expect, fireEvent, screen, userEvent, within } from 'storybook/test';
import {
  DatePrecision,
  Format,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { ProgressLogSheet } from './progress-log-sheet';

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

// Captured at import time so cleanup restores the browser's real implementation.
const realMatchMedia = window.matchMedia;

// ProgressLogSheet now picks dialog-vs-drawer internally, and Storybook runs under
// whatever pointer the host machine has -- always fine on a laptop and in CI -- so the
// drawer branch is unreachable without forcing the query. Same shape
// confirm-provider.spec.tsx uses for vitest, minus `vi`, which browser stories lack.
function withPointer(coarse: boolean) {
  return function PointerDecorator(Story: () => ReactNode) {
    window.matchMedia = ((query: string) =>
      ({
        media: query,
        matches: coarse,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        addListener: () => {},
        removeListener: () => {},
      }) as MediaQueryList) as typeof window.matchMedia;

    useEffect(() => () => void (window.matchMedia = realMatchMedia), []);

    return <Story />;
  };
}

// ProgressLogSheet is controlled and has no defaultOpen -- the real app only ever drives
// it from ReadingCard's own open state -- so each story supplies a trigger and opens it
// through `play`, the same shape as account-menu.stories.tsx.
function ControlledSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <ProgressLogSheet engagement={engagement} open={open} onOpenChange={setOpen} />
    </>
  );
}

// screen, not `within(canvasElement)`, for the assertion: the content renders through a
// portal, which lands outside the story's own element.
async function openSheet({ canvasElement }: { canvasElement: HTMLElement }) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
}

// No `component`: every story renders ControlledSheet, which supplies the open state
// ProgressLogSheet requires, so declaring the component here would only make `args`
// mandatory on stories that never pass any. Save behaviour is covered by
// progress-log-sheet.spec.tsx -- these stories exist for the format and presentation
// variants and the a11y gate, not a second copy of the same interaction assertions.
const meta = {
  play: openSheet,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Print: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
};

export const Audiobook: Story = {
  render: () => (
    <ControlledSheet
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
  decorators: [withPointer(true)],
  render: () => <ControlledSheet engagement={baseEngagement} />,
};

// The stories above all open on today, so they only ever show the chip row in its
// default state. This is the other half of it: the calendar chip selected and carrying a
// date label, and the date input it reveals. A story's own `play` replaces meta's rather
// than composing with it, hence the explicit openSheet call.
export const CustomDate: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Pick a date' }));
    // fireEvent.change, not userEvent.type: a native date input takes segmented
    // keystrokes, so typing the ISO string into it doesn't land.
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: '2025-06-15' } });
    expect(await screen.findByRole('button', { name: 'Jun 15' })).toBeInTheDocument();
  },
};
