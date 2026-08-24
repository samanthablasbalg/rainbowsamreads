import { userEvent } from '@testing-library/user-event';
import { render, screen } from '@/test/render';
import { InlineDateEdit } from './inline-date-edit';

function renderEdit(props: Partial<Parameters<typeof InlineDateEdit>[0]> = {}) {
  const onSave = vi.fn();
  render(<InlineDateEdit value="2025-06-15" label="start date" onSave={onSave} {...props} />);
  return { onSave };
}

describe('InlineDateEdit', () => {
  it('reads as text until it is opened', () => {
    renderEdit();

    expect(screen.getByRole('button', { name: 'Edit start date' })).toHaveTextContent(
      'Jun 15, 2025'
    );
    expect(screen.queryByLabelText('start date')).not.toBeInTheDocument();
  });

  it('shows a dash when there is no date yet', () => {
    renderEdit({ value: null });

    expect(screen.getByRole('button', { name: 'Edit start date' })).toHaveTextContent('—');
  });

  it('swaps the text for an input seeded with the current value', async () => {
    renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));

    expect(screen.getByLabelText('start date')).toHaveValue('2025-06-15');
    expect(screen.queryByRole('button', { name: 'Edit start date' })).not.toBeInTheDocument();
  });

  it('saves the edited date and closes', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));
    await userEvent.clear(screen.getByLabelText('start date'));
    await userEvent.type(screen.getByLabelText('start date'), '2025-06-20');
    await userEvent.click(screen.getByRole('button', { name: 'Save start date' }));

    expect(onSave).toHaveBeenCalledWith('2025-06-20');
    expect(screen.getByRole('button', { name: 'Edit start date' })).toBeInTheDocument();
  });

  it('cancels without saving, and reopens on the original value', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));
    await userEvent.clear(screen.getByLabelText('start date'));
    await userEvent.type(screen.getByLabelText('start date'), '2025-06-20');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel start date edit' }));

    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));
    expect(screen.getByLabelText('start date')).toHaveValue('2025-06-15');
  });

  it('saves on Enter and cancels on Escape', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));
    await userEvent.type(screen.getByLabelText('start date'), '{Escape}');
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));
    await userEvent.type(screen.getByLabelText('start date'), '{Enter}');
    expect(onSave).toHaveBeenCalledWith('2025-06-15');
  });

  it('treats an emptied field as a cancel', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));
    await userEvent.clear(screen.getByLabelText('start date'));
    await userEvent.click(screen.getByRole('button', { name: 'Save start date' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit start date' })).toBeInTheDocument();
  });

  it('stays open holding the typed date when the save is refused', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('before the latest entry'));
    render(<InlineDateEdit value="2025-06-15" label="start date" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));
    await userEvent.clear(screen.getByLabelText('start date'));
    await userEvent.type(screen.getByLabelText('start date'), '2025-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Save start date' }));

    expect(onSave).toHaveBeenCalledWith('2025-01-01');
    expect(await screen.findByLabelText('start date')).toHaveValue('2025-01-01');
    expect(screen.queryByRole('button', { name: 'Edit start date' })).not.toBeInTheDocument();
  });

  it('does not open when disabled', async () => {
    renderEdit({ disabled: true });

    await userEvent.click(screen.getByRole('button', { name: 'Edit start date' }));

    expect(screen.queryByLabelText('start date')).not.toBeInTheDocument();
  });
});
