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

// Only the parts global search uses are storied. Chips, multi-select, the trigger and
// the value display come with the registry component but nothing renders them yet --
// they get stories when something first does.
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

// The popup is only in the DOM while open, so the closed story gives addon-a11y nothing
// but an input -- this is the one that audits the list, the group and the items.
export const Open: Story = {
  args: { items: books, defaultOpen: true },
  render: Closed.render,
};

// ComboboxEmpty is shown by the popup's data-empty state, so it needs a genuinely empty
// item set rather than a story that just renders the element on its own.
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
