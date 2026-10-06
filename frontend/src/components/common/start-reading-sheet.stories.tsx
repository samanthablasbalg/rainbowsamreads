import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, screen, userEvent, within } from 'storybook/test';
import { type BookRead, type CreatableReadingStatus } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { buildBook } from '@/test/data-generators';
import { CREATABLE_STATUSES } from '@/utils/status';
import { StartReadingSheet } from './start-reading-sheet';

const baseBook = buildBook();

function ControlledSheet({
  book,
  statuses,
}: {
  book: BookRead;
  statuses?: readonly CreatableReadingStatus[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <StartReadingSheet
        book={book}
        {...(statuses && { statuses })}
        open={open}
        onOpenChange={setOpen}
      />
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
  render: () => <ControlledSheet book={baseBook} />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet book={baseBook} />,
};

export const AudioLengthRequired: Story = {
  render: () => <ControlledSheet book={baseBook} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Audio' }));
    expect(await screen.findByLabelText('Length')).toHaveValue('');
  },
};

export const NoLengthKnownAtAll: Story = {
  render: () => <ControlledSheet book={buildBook({ default_page_count: null })} />,
};

export const ChoosingWhereItGoes: Story = {
  render: () => <ControlledSheet book={baseBook} statuses={CREATABLE_STATUSES} />,
};

export const AddingAFinishedRead: Story = {
  render: () => <ControlledSheet book={baseBook} statuses={CREATABLE_STATUSES} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(
      await screen.findByRole('button', { name: `Add ${baseBook.title} as Finished` })
    );
    expect(await screen.findByLabelText('Finish date')).toHaveValue('');
  },
};
