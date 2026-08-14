import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress, ProgressLabel, ProgressValue } from './progress';

const meta = {
  component: Progress,
  args: {
    value: 0,
  },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100 },
    },
  },
  render: (args) => (
    <Progress {...args}>
      <ProgressLabel>Uploading files</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { value: 0 } };
export const Mid: Story = { args: { value: 50 } };
export const Complete: Story = { args: { value: 100 } };
export const Indeterminate: Story = { args: { value: null } };
