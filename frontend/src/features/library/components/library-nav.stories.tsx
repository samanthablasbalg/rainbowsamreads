import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route, Routes } from 'react-router';
import { expect, within } from 'storybook/test';
import { LibraryNav } from './library-nav';

const meta = {
  component: LibraryNav,
  parameters: { initialEntries: ['/library/finished'] },
  render: () => (
    <Routes>
      <Route path="/library" element={<LibraryNav />}>
        <Route path=":shelf" element={<></>} />
      </Route>
    </Routes>
  ),
} satisfies Meta<typeof LibraryNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play({ canvasElement }) {
    const canvas = within(canvasElement);
    const active = canvas.getByRole('link', { name: 'Finished' });
    expect(active).toHaveAttribute('aria-current', 'page');

    expect(getComputedStyle(active, '::after').opacity).toBe('1');
    const inactive = canvas.getByRole('link', { name: 'Catalog' });
    expect(getComputedStyle(inactive, '::after').opacity).toBe('0');
  },
};

export const CatalogActive: Story = {
  parameters: { initialEntries: ['/library/catalog'] },
  play({ canvasElement }) {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('link', { name: 'Catalog' })).toHaveAttribute('aria-current', 'page');
  },
};
