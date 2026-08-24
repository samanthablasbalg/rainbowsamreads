import { render, screen } from '@/test/render';
import { NoteExcerpt } from './note-excerpt';

describe('NoteExcerpt', () => {
  it('renders the note as markdown rather than as its source', () => {
    render(<NoteExcerpt>{'> The Beauty of the House is immeasurable.'}</NoteExcerpt>);

    const quote = screen.getByText('The Beauty of the House is immeasurable.');
    expect(quote.closest('blockquote')).toBeVisible();
  });

  it('offers no toggle for a note that fits', () => {
    render(<NoteExcerpt>A striking line from this page.</NoteExcerpt>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
