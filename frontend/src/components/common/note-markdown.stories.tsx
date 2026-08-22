import type { Meta, StoryObj } from '@storybook/react-vite';
import { NoteMarkdown } from './note-markdown';

const meta = {
  component: NoteMarkdown,
  args: {
    children: 'A striking quote from this page.',
  },
} satisfies Meta<typeof NoteMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlainText: Story = {};

export const Emphasis: Story = {
  args: { children: 'The **stones remember** what the *people* forget.' },
};

export const Blockquote: Story = {
  args: {
    children: '> The House is valuable because it is what it is.\n\nAnd nothing more than that.',
  },
};

export const DisallowedElementsStripped: Story = {
  args: {
    children: '# Not a heading\n\n- Not a list item\n\nJust a paragraph.',
  },
};
