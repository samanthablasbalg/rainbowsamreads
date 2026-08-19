import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { BookContents } from './book-contents';

const meta = {
  component: BookContents,
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookContents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

// The blur is the whole point of the section, and it only exists once the panel is open --
// so this is the story that puts it in front of the a11y check.
export const Expanded: Story = {
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Contents' }));
    expect(await canvas.findByText('Coming soon')).toBeVisible();
  },
};
