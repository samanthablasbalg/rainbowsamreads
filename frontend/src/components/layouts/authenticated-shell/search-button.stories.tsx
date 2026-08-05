import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchButton } from './search-button';

const meta = {
  component: SearchButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['ghost', 'outline'],
    },
  },
} satisfies Meta<typeof SearchButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = { args: { variant: 'ghost' } };
export const Outline: Story = { args: { variant: 'outline' } };
