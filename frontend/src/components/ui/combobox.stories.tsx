import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from './combobox';

const books = ['Piranesi', 'The Left Hand of Darkness', 'Small Gods'];

const meta = {
  component: Combobox,
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  args: { items: books },
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput
        showTrigger={false}
        showClear
        aria-label="Search books"
        placeholder="Search books"
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxGroup>
            <ComboboxLabel>In your library</ComboboxLabel>
            {books.map((book) => (
              <ComboboxItem key={book} value={book}>
                {book}
              </ComboboxItem>
            ))}
          </ComboboxGroup>
        </ComboboxList>
        <ComboboxEmpty>No results.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  ),
};

export const Open: Story = {
  args: { items: books, defaultOpen: true },
  render: Closed.render,
};

export const Empty: Story = {
  args: { items: [], defaultOpen: true },
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput
        showTrigger={false}
        showClear
        aria-label="Search books"
        placeholder="Search books"
      />
      <ComboboxContent>
        <ComboboxList />
        <ComboboxEmpty>No results.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  ),
};
