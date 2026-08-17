import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, fireEvent, screen, userEvent, within } from 'storybook/test';
import { Format, ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { buildEngagement } from '@/test/data-generators';
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
      engagement={{
        ...baseEngagement,
        book: {
          ...baseEngagement.book,
          title: 'The House in the Cerulean Sea',
          default_page_count: null,
          default_audio_minutes: 600,
        },
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

export const CustomDate: Story = {
  render: () => <ControlledSheet engagement={baseEngagement} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Pick a date' }));
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: '2025-06-15' } });
    expect(await screen.findByRole('button', { name: 'Jun 15' })).toBeInTheDocument();
  },
};
