import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { NoteExcerpt } from './note-excerpt';

const long = [
  'The House is beautiful and I am grateful to live in it, but there is a loneliness to the',
  'Halls that I did not feel before I began keeping this journal.',
  '',
  '> The Beauty of the House is immeasurable; its Kindness infinite.',
  '',
  'I keep returning to that line. I think it is meant as comfort and I think it is meant as',
  'a warning, and I no longer believe those are different things.',
].join('\n');

const meta = {
  component: NoteExcerpt,
  args: { children: 'A striking line from this page.' },
  // A fixed width, because how many lines a note occupies -- and therefore whether the
  // toggle appears at all -- is a function of how narrow the card is.
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NoteExcerpt>;

export default meta;
type Story = StoryObj<typeof meta>;

// The measurement is layout, which jsdom has no answer for, so the overflow behaviour is
// asserted here in a real browser rather than in the unit spec.
export const Fits: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

export const Overflows: Story = {
  args: { children: long },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: 'Show more' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  },
};

export const Expanded: Story = {
  args: { children: long },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Show more' }));

    const toggle = canvas.getByRole('button', { name: 'Show less' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // The tail of the note only exists on screen once the clamp is off, and the toggle
    // has to survive its own expansion -- measuring while open would retract it.
    await expect(canvas.getByText(/no longer believe those are different things/)).toBeVisible();
  },
};

export const Quote: Story = {
  args: {
    children: '> The Beauty of the House is immeasurable; its Kindness infinite.',
  },
};

export const Emphasis: Story = {
  args: { children: 'The **stones remember** what the *people* forget.' },
};
