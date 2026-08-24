import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, screen, userEvent, within } from 'storybook/test';
import type { EngagementRead } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { buildAudioEngagement, buildEngagement } from '@/test/data-generators';
import { AddFormatSheet } from './add-format-sheet';

const printRead = buildEngagement({ resume_from_page: 150 });

function ControlledSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <AddFormatSheet engagement={engagement} open={open} onOpenChange={setOpen} />
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

export const ReadingInPrint: Story = {
  render: () => <ControlledSheet engagement={printRead} />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet engagement={printRead} />,
};

export const ReadingInAudio: Story = {
  render: () => <ControlledSheet engagement={buildAudioEngagement({ resume_from_minute: 220 })} />,
};

export const AudioLengthRequired: Story = {
  render: () => <ControlledSheet engagement={printRead} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: /Audio/ }));
    expect(await screen.findByLabelText('Length')).toHaveValue('');
  },
};
