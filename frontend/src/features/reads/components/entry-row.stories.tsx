import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { EntryRow } from './entry-row';

const pageEntry = {
  id: 'log-1',
  dateLabel: 'Sun, Jun 15, 2025',
  rangeLabel: 'pp. 50–100',
  amountLabel: '+50 pp',
  isNewest: true,
  loggedOn: '2025-06-15',
  isAudio: false,
  start: 50,
  end: 100,
};

const meta = {
  component: EntryRow,
  args: {
    entry: pageEntry,
    onEdit: fn(),
  },
  // A row is a list item; rendering one outside a list is invalid markup and axe says so.
  decorators: [
    (Story) => (
      <ul className="w-full max-w-md">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof EntryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pages: Story = {};

export const Audio: Story = {
  args: {
    entry: {
      ...pageEntry,
      rangeLabel: '01:20–02:05',
      amountLabel: '+45 min',
      isAudio: true,
      start: 80,
      end: 125,
    },
  },
};

// An older entry looks identical -- what it can and cannot change is the sheet's business,
// not the row's. This story exists to keep that true.
export const Older: Story = {
  args: { entry: { ...pageEntry, isNewest: false } },
};

export const LongRange: Story = {
  args: {
    entry: { ...pageEntry, rangeLabel: 'pp. 1–1088', amountLabel: '+1087 pp' },
  },
};
