import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from '@/components/ui/button';
import type { EntryView } from '../utils/entry-view';
import { EntryEditSheet } from './entry-edit-sheet';

const newestPageEntry: EntryView = {
  id: 'log-1',
  dateLabel: 'Sun, Jun 15, 2025',
  rangeLabel: 'pp. 50–100',
  amountLabel: '+50 pp',
  isNewest: true,
  loggedOn: '2025-06-15',
  isAudio: false,
  start: 50,
  end: 100,
  note: null,
};

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

// No `component`, for the reason progress-log-sheet.stories.tsx gives: every story renders
// ControlledSheet. Save and delete behaviour is covered by the spec; these are the
// presentation variants and the a11y gate.
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
        rangeLabel: '01:20–02:05',
        amountLabel: '+45 min',
        isAudio: true,
        start: 80,
        end: 125,
      }}
    />
  ),
};

// The other half of the sheet: an older entry has no position field and no delete, and
// says why rather than showing a control the API would reject.
export const OlderEntry: Story = {
  render: () => <ControlledSheet entry={{ ...newestPageEntry, isNewest: false }} />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet entry={newestPageEntry} />,
};

// The note starts open (decision 5), so its textarea and typed text are part of the a11y
// gate here rather than only behind an unopened "+ Add a note" trigger.
export const EntryWithNote: Story = {
  render: () => (
    <ControlledSheet entry={{ ...newestPageEntry, note: 'A striking quote from this page.' }} />
  ),
};
