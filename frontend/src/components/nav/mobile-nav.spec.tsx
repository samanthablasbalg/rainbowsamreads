import { render, screen, within } from '@/test/render';
import { MobileNav } from './mobile-nav';

// Same contract as the rail, different layout: one link per destination, and the active
// one named by aria-current rather than by its styling.
describe('MobileNav', () => {
  it('renders one link per destination', () => {
    render(<MobileNav />);

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
    expect(within(nav).getByRole('link', { name: 'Insights' })).toHaveAttribute(
      'href',
      '/insights'
    );
  });

  it('marks the destination matching the current URL as current', () => {
    render(<MobileNav />, { initialEntries: ['/challenges'] });

    expect(screen.getByRole('link', { name: 'Challenges' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });
});
