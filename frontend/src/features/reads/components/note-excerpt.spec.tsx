import { render, screen } from '@/test/render';
import { NoteExcerpt } from './note-excerpt';

// Whether the toggle appears is a question about layout, and jsdom reports every height
// as zero -- so nothing here can overflow, and the toggle's own behaviour is asserted in
// note-excerpt.stories.tsx, which runs in a real browser.
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
