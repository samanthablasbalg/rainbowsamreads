import { Suspense } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { getEngagementsListProgressLogsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { buildEngagement, buildPageLog } from '@/test/data-generators';
import { EntryTimeline } from './entry-timeline';

const reading = buildEngagement({
  length_pages: 200,
  status: ReadingStatus.reading,
  finished_on: null,
});

const twoDays = [
  buildPageLog({ id: 'older', logged_on: '2025-06-14', page_start: 0, page_end: 50 }),
  buildPageLog({ id: 'newer', logged_on: '2025-06-15', page_start: 50, page_end: 100 }),
];

const meta = {
  component: EntryTimeline,
  args: { engagement: reading, onLogProgress: fn() },
  decorators: [
    (Story) => (
      <Suspense fallback={null}>
        <div className="max-w-lg">
          <Story />
        </div>
      </Suspense>
    ),
  ],
  async beforeEach({ msw }) {
    msw.use(getEngagementsListProgressLogsMockHandler(twoDays));
  },
} satisfies Meta<typeof EntryTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SameDay: Story = {
  async beforeEach({ msw }) {
    msw.use(
      getEngagementsListProgressLogsMockHandler([
        buildPageLog({ id: 'morning', logged_on: '2025-06-15', page_start: 0, page_end: 50 }),
        buildPageLog({
          id: 'evening',
          logged_on: '2025-06-15',
          page_start: 50,
          page_end: 100,
          note: '> The stones remember what the people forget.',
        }),
      ])
    );
  },
};

export const Finished: Story = {
  args: { engagement: buildEngagement({ length_pages: 200 }) },
};

export const Empty: Story = {
  async beforeEach({ msw }) {
    msw.use(getEngagementsListProgressLogsMockHandler([]));
  },
};
