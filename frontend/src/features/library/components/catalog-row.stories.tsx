import type { Meta, StoryObj } from '@storybook/react-vite';
import { buildBook } from '@/test/data-generators';
import { CatalogRow } from './catalog-row';

const book = buildBook();

const meta = {
  component: CatalogRow,
  args: { book },
  render: (args) => (
    <ul>
      <CatalogRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof CatalogRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AudioOnly: Story = {
  args: { book: { ...book, default_page_count: null, default_audio_minutes: 512 } },
};

export const BothLengths: Story = {
  args: { book: { ...book, default_audio_minutes: 512 } },
};

export const NoLength: Story = {
  args: { book: { ...book, default_page_count: null, default_audio_minutes: null } },
};

export const ManyAuthors: Story = {
  args: {
    book: {
      ...book,
      title: 'The Rise and Fall of the Third Chimpanzee: Evolution and Human Life',
      authors: [
        { id: 'author-1', name: 'Susanna Clarke' },
        { id: 'author-2', name: 'Neil Gaiman' },
        { id: 'author-3', name: 'Terry Pratchett' },
      ],
    },
  },
};
