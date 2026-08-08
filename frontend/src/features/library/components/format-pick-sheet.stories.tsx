import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type ReactNode } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';
import { DatePrecision, type BookRead } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { FormatPickSheet } from './format-pick-sheet';

const baseBook: BookRead = {
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
};

// Captured at import time so cleanup restores the browser's real implementation.
const realMatchMedia = window.matchMedia;

// Same shape progress-log-sheet.stories.tsx uses: the sheet picks dialog-vs-drawer off
// the host machine's pointer, so the drawer branch is unreachable without forcing it.
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

// Controlled with no defaultOpen, the way CatalogRow drives it, so each story opens it
// through `play`.
function ControlledSheet({ book }: { book: BookRead }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <FormatPickSheet book={book} open={open} onOpenChange={setOpen} />
    </>
  );
}

// screen, not `within(canvasElement)`: the content renders through a portal, outside the
// story's own element.
async function openSheet({ canvasElement }: { canvasElement: HTMLElement }) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
}

// No `component`: every story renders ControlledSheet, which supplies the open state
// FormatPickSheet requires. The mutation and its navigation are covered by
// format-pick-sheet.spec.tsx -- these stories exist for the two steps, the drawer
// branch and the a11y gate.
const meta = {
  play: openSheet,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FormatChoice: Story = {
  render: () => <ControlledSheet book={baseBook} />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet book={baseBook} />,
};

// The second step, which only exists for an audio book with no stored length. A story's
// own `play` replaces meta's rather than composing with it, hence the explicit call.
export const AudioLength: Story = {
  render: () => <ControlledSheet book={baseBook} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );
    expect(await screen.findByLabelText('How long is the audiobook?')).toBeInTheDocument();
  },
};

// An audio book whose length is already known skips the second step entirely -- the
// picker is the same three buttons, and Audio starts the read directly.
export const AudioLengthAlreadyKnown: Story = {
  render: () => <ControlledSheet book={{ ...baseBook, default_audio_minutes: 600 }} />,
};
