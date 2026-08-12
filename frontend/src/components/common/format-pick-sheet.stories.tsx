import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, screen, userEvent, within } from 'storybook/test';
import { EngagementCreateStatus } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { FormatPickSheet } from './format-pick-sheet';

type SheetProps = Omit<React.ComponentProps<typeof FormatPickSheet>, 'open' | 'onOpenChange'>;

const baseBook: SheetProps = {
  bookId: 'book-1',
  title: 'Piranesi',
  audioMinutes: null,
};

// Controlled with no defaultOpen, the way CatalogRow drives it, so each story opens it
// through `play`.
function ControlledSheet(props: SheetProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <FormatPickSheet {...props} open={open} onOpenChange={setOpen} />
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
  render: () => <ControlledSheet {...baseBook} />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet {...baseBook} />,
};

// Search opens the sheet with all three statuses, which puts a step in front of the
// format list. The catalog passes none and never sees this.
export const StatusChoice: Story = {
  render: () => (
    <ControlledSheet
      {...baseBook}
      statuses={[
        EngagementCreateStatus.reading,
        EngagementCreateStatus.finished,
        EngagementCreateStatus.dnf,
      ]}
      cancelLabel="No thanks — just import"
    />
  ),
};

// The second step, which only exists for an audio book with no stored length. A story's
// own `play` replaces meta's rather than composing with it, hence the explicit call.
export const AudioLength: Story = {
  render: () => <ControlledSheet {...baseBook} />,
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
  render: () => <ControlledSheet {...baseBook} audioMinutes={600} />,
};
