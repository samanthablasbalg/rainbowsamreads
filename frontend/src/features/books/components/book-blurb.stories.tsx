import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { buildBook } from '@/test/data-generators';
import { BookBlurb } from './book-blurb';

const long = [
  'Piranesi lives in the House. Perhaps he always has. In his notebooks, day after day,',
  'he makes a clear and careful record of its wonders: the labyrinth of halls, the',
  'thousands upon thousands of statues, the tides that thunder up staircases, the clouds',
  'that move in slow procession through the upper halls.',
  '',
  'On Tuesdays and Fridays Piranesi sees his friend, the Other. At other times he brings',
  'tributes of food and waterlilies to the Dead. But mostly, he is alone.',
].join(' ');

const meta = {
  component: BookBlurb,
  args: { book: buildBook({ description: long }) },
} satisfies Meta<typeof BookBlurb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Clamped: Story = {};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));
  },
};

// Short enough that the clamp never bites, so More still shows but changes nothing.
export const Short: Story = {
  args: { book: buildBook({ description: 'A house that is the whole world.' }) },
};

// Google has no description for plenty of books; the section removes itself rather than
// leaving a heading over nothing.
export const Missing: Story = {
  args: { book: buildBook({ description: null }) },
};
