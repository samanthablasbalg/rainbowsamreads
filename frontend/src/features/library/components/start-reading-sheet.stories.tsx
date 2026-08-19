import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, screen, userEvent, within } from 'storybook/test';
import type { BookRead } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { buildBook } from '@/test/data-generators';
import { StartReadingSheet } from './start-reading-sheet';

function ControlledSheet(overrides: Partial<BookRead>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <StartReadingSheet book={buildBook(overrides)} open={open} onOpenChange={setOpen} />
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

export const KnownPageCount: Story = {
  render: () => <ControlledSheet />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet />,
};

// Audio has no length until the first read captures one, so the field is required and
// shows no placeholder to accept.
export const AudioLengthRequired: Story = {
  render: () => <ControlledSheet />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Audio' }));
    expect(await screen.findByLabelText('Length')).toHaveValue('');
  },
};

export const NoLengthKnownAtAll: Story = {
  render: () => <ControlledSheet default_page_count={null} />,
};
