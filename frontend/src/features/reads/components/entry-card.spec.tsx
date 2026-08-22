import { userEvent } from '@testing-library/user-event';
import { buildEntryView } from '@/test/data-generators';
import { render, screen } from '@/test/render';
import { EntryCard } from './entry-card';

const entry = buildEntryView();

describe('EntryCard', () => {
  it('shows the span it covered and the amount it added', () => {
    render(<EntryCard entry={entry} onEdit={() => {}} />);

    expect(screen.getByText('p. 50')).toBeVisible();
    expect(screen.getByText('p. 100')).toBeVisible();
    expect(screen.getByText('+50 pp')).toBeVisible();
  });

  it('leaves the date to the day group rather than repeating it', () => {
    render(<EntryCard entry={entry} onEdit={() => {}} />);

    expect(screen.queryByText('Jun 15')).not.toBeInTheDocument();
  });

  it('names its edit control with the entry it edits', async () => {
    const onEdit = vi.fn();
    render(<EntryCard entry={entry} onEdit={onEdit} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Edit entry from Sun, Jun 15, 2025' })
    );

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('exposes exactly one control on an entry with no note', () => {
    render(<EntryCard entry={entry} onEdit={() => {}} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('renders a note when the entry carries one', () => {
    render(<EntryCard entry={{ ...entry, note: '> A quote worth keeping.' }} onEdit={() => {}} />);

    expect(screen.getByText('A quote worth keeping.').closest('blockquote')).toBeVisible();
  });
});
