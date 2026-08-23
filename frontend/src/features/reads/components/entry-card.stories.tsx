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
      isAudio: true,
      start: 80,
      end: 125,
      startPct: 32,
      endPct: 50,
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
      start: 100,
      end: 100,
      startPct: 50,
      endPct: 50,
      note: 'A second quote from this page.',
    },
  },
};

export const StartOfBook: Story = {
  args: {
    entry: { ...pageEntry, fromLabel: 'p. 0', toLabel: 'p. 40', startPct: 0, endPct: 20 },
  },
};

export const LongSpan: Story = {
  args: {
    entry: {
      ...pageEntry,
      fromLabel: 'p. 1',
      toLabel: 'p. 1088',
      amountLabel: '+1087 pp',
      startPct: 0,
      endPct: 100,
    },
  },
};
