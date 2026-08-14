import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { buildEngagement } from '@/test/data-generators';
import { EngagementRow } from './engagement-row';

const meta = {
  component: EngagementRow,
  args: { engagement: buildEngagement() },
  render: (args) => (
    <ul>
      <EngagementRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof EngagementRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finished: Story = {};

export const FinishedAndRated: Story = {
  args: { engagement: buildEngagement({ review: { rating: '4.00', body: null } }) },
};

export const QuarterStarRating: Story = {
  args: { engagement: buildEngagement({ review: { rating: '3.75', body: null } }) },
  play({ canvasElement }) {
    const stars = within(canvasElement).getByRole('img', { name: 'Rated 3.75 out of 5' });
    const [base, filled] = Array.from(stars.children);

    const ratio = filled.getBoundingClientRect().width / base.getBoundingClientRect().width;

    expect(ratio).toBeLessThan(3.75 / 5);
    expect(ratio).toBeCloseTo(0.7289, 3);

    const glyph = filled.querySelector('svg');
    expect(getComputedStyle(glyph!).fill).not.toBe('none');
  },
};

export const Dnf: Story = {
  args: {
    engagement: buildEngagement({
      status: ReadingStatus.dnf,
      finished_on: null,
      abandoned_on: '2025-04-02',
      completion_pct: 43,
      resume_from_page: 117,
    }),
  },
};

export const DnfAndRated: Story = {
  args: {
    engagement: buildEngagement({
      status: ReadingStatus.dnf,
      finished_on: null,
      abandoned_on: '2025-04-02',
      completion_pct: 43,
      review: { rating: '1.25', body: 'Gave up.' },
    }),
  },
};

export const MultipleFormats: Story = {
  args: { engagement: buildEngagement({ formats: [Format.print, Format.audio] }) },
};
