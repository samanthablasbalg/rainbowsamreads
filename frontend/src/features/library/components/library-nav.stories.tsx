import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route, Routes } from 'react-router';
import { expect, within } from 'storybook/test';
import { LibraryNav } from './library-nav';

// The nav's links are relative (`tbr`, not `/library/tbr`), so what they resolve to
// depends on how the route is nested -- and this harness has to mirror the real tree or
// it tests itself. The nav sits on the route matched at `/library`, with the shelf as a
// *child* route; a `path="/library/*"` splat instead would resolve every link against
// the whole URL and send them one level too deep, leaving nothing active.
//
// The preview decorator supplies the MemoryRouter -- and refuses a second one -- so this
// supplies only the missing route context, and picks the URL via `initialEntries`.
const meta = {
  component: LibraryNav,
  parameters: { initialEntries: ['/library/finished'] },
  render: () => (
    <Routes>
      <Route path="/library" element={<LibraryNav />}>
        {/* The shelf itself is another story's subject; this only has to match, so that
            the nav above resolves against /library. An empty element rather than none,
            which React Router warns about. */}
        <Route path=":shelf" element={<></>} />
      </Route>
    </Routes>
  ),
} satisfies Meta<typeof LibraryNav>;

export default meta;
type Story = StoryObj<typeof meta>;

// Asserted, not just rendered: an a11y check alone passes just as happily when no link
// is active at all, which is exactly how the broken harness above went unnoticed.
//
// The underline is checked as a computed style because it is a pseudo-element -- there
// is no node to query, and asserting the class string would only restate the source. The
// storybook project runs in real Chromium, so this is the actual painted value.
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

// A second URL, because which link is underlined is the only thing this component
// varies, and one story can only ever show it in one position.
export const CatalogActive: Story = {
  parameters: { initialEntries: ['/library/catalog'] },
  play({ canvasElement }) {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('link', { name: 'Catalog' })).toHaveAttribute('aria-current', 'page');
  },
};
