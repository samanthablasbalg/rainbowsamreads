import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { withPointer } from '@/test/pointer-decorator';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Format, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { buildEngagement } from '@/test/data-generators';
import { FinishReadSheet } from './finish-read-sheet';

const printRead = buildEngagement({ resume_from_page: 250 });

const mixedRead = buildEngagement({
  formats: [Format.print, Format.audio],
  length_minutes: 600,
  frontier_minute: 600,
});

function ControlledSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open
      </Button>
      <FinishReadSheet engagement={engagement} open={open} onOpenChange={setOpen} />
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

export const OneFormat: Story = {
  render: () => <ControlledSheet engagement={printRead} />,
};

export const MobileSheet: Story = {
  decorators: [withPointer(true)],
  render: () => <ControlledSheet engagement={printRead} />,
};

export const TwoRulers: Story = {
  render: () => <ControlledSheet engagement={mixedRead} />,
};

export const RulerPicked: Story = {
  render: () => <ControlledSheet engagement={mixedRead} />,
  play: async (context) => {
    await openSheet(context);
    await userEvent.click(await screen.findByRole('button', { name: 'Minutes' }));
    expect(screen.getByRole('button', { name: 'Minutes' })).toHaveAttribute('aria-pressed', 'true');
  },
};
