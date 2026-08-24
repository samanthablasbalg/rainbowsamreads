import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from '@/components/ui/button';
import { buildEntryView } from '@/test/data-generators';
import type { EntryView } from '../utils/entry-view';
import { EntryEditSheet } from './entry-edit-sheet';

const newestPageEntry = buildEntryView();

function ControlledSheet({ entry }: { entry: EntryView }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <EntryEditSheet
        engagementId="engagement-1"
        entry={entry}
        open={open}
        onOpenChange={setOpen}
        onRequestDelete={() => setOpen(false)}
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

export const NewestPageEntry: Story = {
  render: () => <ControlledSheet entry={newestPageEntry} />,
};

export const NewestAudioEntry: Story = {
  render: () => (
    <ControlledSheet
      entry={{
        ...newestPageEntry,
        amountLabel: '+45 min',
        isAudio: true,
        start: 80,
        end: 125,
      }}
    />
  ),
};

export const OlderEntry: Story = {
  render: () => <ControlledSheet entry={{ ...newestPageEntry, isNewest: false }} />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet entry={newestPageEntry} />,
};

export const EntryWithNote: Story = {
  render: () => (
    <ControlledSheet entry={{ ...newestPageEntry, note: 'A striking quote from this page.' }} />
  ),
};

export const EditingExistingNote: Story = {
  render: () => (
    <ControlledSheet entry={{ ...newestPageEntry, note: 'A striking quote from this page.' }} />
  ),
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit note' }));
    expect(await screen.findByLabelText('Note')).toHaveValue('A striking quote from this page.');
  },
};
