import { userEvent } from '@testing-library/user-event';
import { render, screen } from '@/test/render';
import { EntryRow } from './entry-row';

const entry = {
  id: 'log-1',
  dateLabel: 'Sun, Jun 15, 2025',
  rangeLabel: 'pp. 50–100',
  amountLabel: '+50 pp',
  isNewest: true,
  loggedOn: '2025-06-15',
  isAudio: false,
  start: 50,
  end: 100,
  note: null,
};

describe('EntryRow', () => {
  it('shows the date, the range and the amount covered', () => {
    render(
      <ul>
        <EntryRow entry={entry} onEdit={() => {}} />
      </ul>
    );

    const row = screen.getByRole('listitem');
    expect(row).toHaveTextContent('Sun, Jun 15, 2025');
    expect(row).toHaveTextContent('pp. 50–100');
    expect(row).toHaveTextContent('+50 pp');
  });

  it('names its edit control with the entry it edits', async () => {
    const onEdit = vi.fn();
    render(
      <ul>
        <EntryRow entry={entry} onEdit={onEdit} />
      </ul>
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Edit entry from Sun, Jun 15, 2025' })
    );

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('exposes exactly one control, the edit button', () => {
    render(
      <ul>
        <EntryRow entry={entry} onEdit={() => {}} />
      </ul>
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
