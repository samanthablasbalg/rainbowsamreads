import type { Meta, StoryObj } from '@storybook/react-vite';
import { Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { ReadingCard } from './reading-card';

const baseEngagement = buildEngagement({
  id: 'engagement-1',
  status: ReadingStatus.reading,
  started_on: '2025-01-01',
  finished_on: null,
  resume_from_page: 132,
  completion_pct: 52,
});

const meta = {
  component: ReadingCard,
  args: {
    engagement: baseEngagement,
  },
  render: (args) => (
    <ul>
      <ReadingCard {...args} />
    </ul>
  ),
} satisfies Meta<typeof ReadingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Print: Story = {};

export const Audiobook: Story = {
  args: {
    engagement: {
      ...baseEngagement,
      book: buildBook({ title: 'The House in the Cerulean Sea' }),
      formats: [Format.audio],
      completion_pct: 30,
    },
  },
};

export const MultiFormat: Story = {
  args: {
    engagement: { ...baseEngagement, formats: [Format.print, Format.audio] },
  },
};

export const NotStarted: Story = {
  args: { engagement: { ...baseEngagement, completion_pct: null } },
};
