import { render, screen } from '@/test/render';
import { NoteMarkdown } from './note-markdown';

describe('NoteMarkdown', () => {
  it('renders emphasis and strong', () => {
    render(<NoteMarkdown>{'The **stones remember** what the *people* forget.'}</NoteMarkdown>);

    expect(screen.getByText('stones remember').tagName).toBe('STRONG');
    expect(screen.getByText('people').tagName).toBe('EM');
  });

  it('renders a blockquote', () => {
    render(<NoteMarkdown>{'> A quote from the page.'}</NoteMarkdown>);

    expect(screen.getByText('A quote from the page.').closest('blockquote')).toBeVisible();
  });

  it('unwraps a disallowed element instead of dropping its text', () => {
    render(<NoteMarkdown>{'# Not a heading'}</NoteMarkdown>);

    expect(screen.getByText('Not a heading').tagName).not.toBe('H1');
  });

  it('escapes raw HTML rather than rendering it', () => {
    render(<NoteMarkdown>{'<script>alert(1)</script>'}</NoteMarkdown>);

    expect(document.querySelector('script')).not.toBeInTheDocument();
    expect(screen.getByText('<script>alert(1)</script>')).toBeVisible();
  });
});
