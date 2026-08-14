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

async function openSheet({ canvasElement }: { canvasElement: HTMLElement }) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
}

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

export const AudioLengthAlreadyKnown: Story = {
  render: () => <ControlledSheet {...baseBook} audioMinutes={600} />,
};
