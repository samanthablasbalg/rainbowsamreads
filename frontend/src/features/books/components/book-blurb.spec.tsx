import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/render';
import { buildBook } from '@/test/data-generators';
import { BookBlurb } from './book-blurb';

describe('BookBlurb', () => {
  it('expands in place and collapses again', async () => {
    const user = userEvent.setup();
    render(<BookBlurb book={buildBook({ description: 'A house that is the whole world.' })} />);

    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: 'Less' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Less' }));
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
  });

  it('renders nothing when the book has no description', () => {
    const { container } = render(<BookBlurb book={buildBook({ description: null })} />);

    expect(container).toBeEmptyDOMElement();
  });
});
