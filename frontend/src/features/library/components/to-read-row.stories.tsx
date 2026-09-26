import type { Meta, StoryObj } from '@storybook/react-vite';
import { Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { buildEngagement } from '@/test/data-generators';
import { ToReadRow } from './to-read-row';

const meta = {
  component: ToReadRow,
  args: { engagement: buildEngagement({ status: ReadingStatus.tbr, formats: [] }) },
  render: (args) => (
    <ul>
      <ToReadRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof ToReadRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToRead: Story = {};

export const WithIntendedFormat: Story = {
  args: { engagement: buildEngagement({ status: ReadingStatus.tbr, formats: [Format.audio] }) },
};
