import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { buildEngagement } from '@/test/data-generators';
import { EngagementRow } from './engagement-row';

// The row renders an <li>, so every story supplies the <ul> it belongs in -- a loose
// list item is something axe reports, correctly.
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

// Finished, never rated: the "Add rating" CTA stands in for the stars.
export const Finished: Story = {};

export const FinishedAndRated: Story = {
  args: { engagement: buildEngagement({ review: { rating: '4.00', body: null } }) },
};

// The case the two-layer star overlay exists for: a quarter has no glyph, so it can only
// be drawn by clipping.
//
// Measured rather than eyeballed. An a11y check passes just as happily on a row clipped
// to the wrong width -- or to nothing -- and the fraction is the whole reason this
// component is hand-built, so the painted geometry is what gets asserted.
export const QuarterStarRating: Story = {
  args: { engagement: buildEngagement({ review: { rating: '3.75', body: null } }) },
  play({ canvasElement }) {
    const stars = within(canvasElement).getByRole('img', { name: 'Rated 3.75 out of 5' });
    const [base, filled] = Array.from(stars.children);

    const ratio = filled.getBoundingClientRect().width / base.getBoundingClientRect().width;

    // Three full stars plus 0.6444 of the fourth, not 3.75/5 -- the clip is placed where
    // three quarters of the fourth star's *area* is covered, which is left of where a
    // naive width split would put it. That inequality is the correction; the exact value
    // guards it against drifting back.
    expect(ratio).toBeLessThan(3.75 / 5);
    expect(ratio).toBeCloseTo(0.7289, 3);

    // The overlay is only distinguishable from the row underneath if its stars are
    // solid -- Hugeicons' glyphs are stroke-only until `fill` is passed through.
    const glyph = filled.querySelector('svg');
    expect(getComputedStyle(glyph!).fill).not.toBe('none');
  },
};

// DNF swaps the date for `abandoned_on` and adds where the read stopped.
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

// A read bound to more than one edition -- formats is an array, and each gets its icon.
export const MultipleFormats: Story = {
  args: { engagement: buildEngagement({ formats: [Format.print, Format.audio] }) },
};
