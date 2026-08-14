import type { Meta, StoryObj } from '@storybook/react-vite';
import { Format } from '@/api/generated/readingTracker.schemas';
import { FormatIcons } from './format-icons';

const meta = {
  component: FormatIcons,
  args: {
    formats: [Format.print],
  },
} satisfies Meta<typeof FormatIcons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Print: Story = {};
export const Digital: Story = { args: { formats: [Format.digital] } };
export const Audio: Story = { args: { formats: [Format.audio] } };

export const PrintAndAudio: Story = { args: { formats: [Format.print, Format.audio] } };

export const None: Story = { args: { formats: [] } };
