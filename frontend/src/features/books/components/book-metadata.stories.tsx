import type { Meta, StoryObj } from '@storybook/react-vite';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { BookMetadata } from './book-metadata';

const book = buildBook();

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
];

const meta = {
  component: BookMetadata,
  args: { book, engagements },
  decorators: [
    (Story) => (
      <div className="w-60">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookMetadata>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tracked: Story = {};

export const Untracked: Story = {
  args: { engagements: [] },
};
