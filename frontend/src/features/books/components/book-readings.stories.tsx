import type { Meta, StoryObj } from '@storybook/react-vite';
import { buildEngagement } from '@/test/data-generators';
import { BookReadings } from './book-readings';

const engagements = [
  buildEngagement({
    id: 'engagement-1',
    started_on: '2026-02-01',
    finished_on: '2026-02-07',
    review: { rating: '5.00', body: 'A house that is the whole world.' },
  }),
  buildEngagement({
    id: 'engagement-2',
    started_on: '2023-08-01',
    finished_on: '2023-08-12',
    review: { rating: '4.50', body: null },
  }),
  buildEngagement({
    id: 'engagement-3',
    started_on: '2019-03-01',
    finished_on: '2019-03-22',
    review: null,
  }),
];

const meta = {
  component: BookReadings,
  args: { tracked: true, engagements },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookReadings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tracked: Story = {};

export const Untracked: Story = {
  args: { tracked: false, engagements: [] },
};
