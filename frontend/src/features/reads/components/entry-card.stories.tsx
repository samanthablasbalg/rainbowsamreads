import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { buildEntryView } from '@/test/data-generators';
import { EntryCard } from './entry-card';

const pageEntry = buildEntryView();

const meta = {
  component: EntryCard,
  args: {
    entry: pageEntry,
    onEdit: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-88">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pages: Story = {};

export const Audio: Story = {
  args: {
    entry: {
      ...pageEntry,
      fromLabel: '01:20',
      toLabel: '02:05',
      amountLabel: '+45 min',
      spanLabel: 'New ground, 01:20 to 02:05',
      isAudio: true,
      start: 80,
      end: 125,
      splitAt: 80,
      startPct: 32,
      splitPct: 32,
      endPct: 50,
      coveredPct: 32,
    },
  },
};

export const WithNote: Story = {
  args: {
    entry: {
      ...pageEntry,
      note: '> The Beauty of the House is immeasurable; its Kindness infinite.\n\nI keep returning to that line.',
    },
  },
};

// The zero-length entry a note-only log produces: no ground covered, so the span has
// nothing to draw and the delta reads +0.
export const NoteOnly: Story = {
  args: {
    entry: {
      ...pageEntry,
      fromLabel: 'p. 100',
      toLabel: 'p. 100',
      amountLabel: '+0 pp',
      spanLabel: 'New ground, p. 100 to p. 100',
      start: 100,
      end: 100,
      splitAt: 100,
      startPct: 50,
      splitPct: 50,
      endPct: 50,
      coveredPct: 50,
      note: 'A second quote from this page.',
    },
  },
};

export const StartOfBook: Story = {
  args: {
    entry: {
      ...pageEntry,
      fromLabel: 'p. 0',
      toLabel: 'p. 40',
      start: 0,
      end: 40,
      splitAt: 0,
      startPct: 0,
      splitPct: 0,
      endPct: 20,
      coveredPct: 0,
    },
  },
};

export const LongSpan: Story = {
  args: {
    entry: {
      ...pageEntry,
      fromLabel: 'p. 1',
      toLabel: 'p. 1088',
      amountLabel: '+1087 pp',
      start: 1,
      end: 1088,
      splitAt: 1,
      startPct: 0,
      splitPct: 0,
      endPct: 100,
      coveredPct: 0,
    },
  },
};

// Behind the frontier the whole way: the read was at p. 120 and this went back over
// pp. 20-60. All of it re-read, so completion never moved and the bar keeps showing the
// ground already covered running on past it.
export const Reread: Story = {
  args: {
    entry: {
      ...pageEntry,
      fromLabel: 'p. 20',
      toLabel: 'p. 60',
      amountLabel: '40 pp',
      spanLabel: 'Re-read, p. 20 to p. 60',
      start: 20,
      end: 60,
      hasNewGround: false,
      splitAt: 60,
      startPct: 10,
      splitPct: 30,
      endPct: 30,
      coveredPct: 60,
    },
  },
};

// The catch-up this all exists for: at p. 100, read pp. 80-130. Stored as two rows and
// shown as one entry, orange up to the frontier and pink past it.
export const CrossesFrontier: Story = {
  args: {
    entry: {
      ...pageEntry,
      fromLabel: 'p. 80',
      toLabel: 'p. 130',
      amountLabel: '+50 pp',
      spanLabel: 'Re-read p. 80 to p. 100, then new ground to p. 130',
      start: 80,
      end: 130,
      splitAt: 100,
      startPct: 40,
      splitPct: 50,
      endPct: 65,
      coveredPct: 50,
    },
  },
};
