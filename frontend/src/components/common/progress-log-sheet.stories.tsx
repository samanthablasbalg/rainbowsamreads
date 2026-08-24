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

export const EditingTheStart: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
  play: async (context) => {
    await openSheet(context);
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
