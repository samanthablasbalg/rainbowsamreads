import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, fireEvent, screen, userEvent, within } from 'storybook/test';
import { Format, ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { buildAudioEngagement, buildEngagement } from '@/test/data-generators';
import { Button } from '@/components/ui/button';
import { ProgressLogSheet } from './progress-log-sheet';

const baseEngagement = buildEngagement({
  id: 'engagement-1',
  status: ReadingStatus.reading,
  finished_on: null,
  resume_from_page: 132,
  completion_pct: 52,
});

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

async function openSheet({ canvasElement }: { canvasElement: HTMLElement }) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
}

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
      engagement={buildAudioEngagement({
        id: 'engagement-1',
        title: 'The House in the Cerulean Sea',
        status: ReadingStatus.reading,
        finished_on: null,
        resume_from_minute: 75,
        completion_pct: 30,
      })}
    />
  ),
};

// Only a read bound in both rulers gets the switch, and both chips read off one shared
// frontier: page 132 of 272 is the same spot as 04:51 of 10:00.
export const MultiFormat: Story = {
  render: () => (
    <ControlledSheet
      engagement={{
        ...baseEngagement,
        formats: [Format.print, Format.audio],
        resume_from_minute: 291,
        length_minutes: 600,
      }}
    />
  ),
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Minutes' }));

    expect(await screen.findByPlaceholderText('--:--')).toBeInTheDocument();
    expect(screen.getByText('04:51')).toBeInTheDocument();
  },
};

// The catch-up pass: the stretch just read started behind the frontier, and the start
// position is the only way to say so. A value until it is clicked, an input after.
export const EditingTheStart: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
  play: async (context) => {
    await openSheet(context);
    // Nothing beside the swapped cell may move, which is a layout fact and so is checked
    // here rather than in the spec: the To field sits in the same box either way.
    const before = (await screen.findByLabelText('To · now')).getBoundingClientRect();

    await userEvent.click(await screen.findByRole('button', { name: 'Edit start position' }));
    const field = await screen.findByLabelText('start position');
    await userEvent.clear(field);
    await userEvent.type(field, '90');

    expect(field).toHaveValue('90');
    expect(screen.getByLabelText('To · now').getBoundingClientRect()).toEqual(before);
  },
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet engagement={baseEngagement} />,
};

export const CustomDate: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Pick a date' }));
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: '2025-06-15' } });
    expect(await screen.findByRole('button', { name: 'Jun 15' })).toBeInTheDocument();
  },
};

// A note is what makes staying on the same page valid at all -- the position field alone
// would 409 on the server, and the frontend now agrees before it ever gets there.
export const SamePageWithNote: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.type(await screen.findByPlaceholderText('---'), '132');
    await userEvent.click(await screen.findByRole('button', { name: '+ Add a note' }));
    await userEvent.type(screen.getByLabelText('Note'), 'A striking quote from this page.');

    expect(await screen.findByRole('button', { name: /Save progress/ })).toBeEnabled();
  },
};
