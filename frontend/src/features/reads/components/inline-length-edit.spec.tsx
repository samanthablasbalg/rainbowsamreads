import { userEvent } from '@testing-library/user-event';
import { render, screen } from '@/test/render';
import { InlineLengthEdit } from './inline-length-edit';

function renderEdit(props: Partial<Parameters<typeof InlineLengthEdit>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<InlineLengthEdit value={272} isAudio={false} onSave={onSave} {...props} />);
  return { onSave };
}

describe('InlineLengthEdit', () => {
  it('names its unit, since the row it sits in does not', () => {
    renderEdit();

    expect(screen.getByRole('button', { name: 'Edit length' })).toHaveTextContent('272 pages');
  });

  it('reads an audio length as a duration', () => {
    renderEdit({ value: 600, isAudio: true });

    expect(screen.getByRole('button', { name: 'Edit length' })).toHaveTextContent('10:00');
  });

  it('shows a dash when nothing has given the read a length', () => {
    renderEdit({ value: null });

    expect(screen.getByRole('button', { name: 'Edit length' })).toHaveTextContent('—');
  });

  it('swaps the text for an input seeded with the current length', async () => {
    renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));

    expect(screen.getByLabelText('length')).toHaveValue('272');
    expect(screen.queryByRole('button', { name: 'Edit length' })).not.toBeInTheDocument();
  });

  it('saves the corrected length and closes', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), '250');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    expect(onSave).toHaveBeenCalledWith(250);
    expect(await screen.findByRole('button', { name: 'Edit length' })).toBeInTheDocument();
  });

  it('saves an audio length as minutes', async () => {
    const { onSave } = renderEdit({ value: 600, isAudio: true });

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), '09:30');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    expect(onSave).toHaveBeenCalledWith(570);
  });

  it('cancels without saving, and reopens on the original length', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), '250');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel length edit' }));

    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    expect(screen.getByLabelText('length')).toHaveValue('272');
  });

  it('saves on Enter and cancels on Escape', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.type(screen.getByLabelText('length'), '{Escape}');
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.type(screen.getByLabelText('length'), '{Enter}');
    expect(onSave).toHaveBeenCalledWith(272);
  });

  it('treats an emptied field as a cancel', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit length' })).toBeInTheDocument();
  });

  it('says why it will not save a length that is not a number', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number');
    expect(screen.getByLabelText('length')).toHaveAttribute('aria-invalid', 'true');
  });

  it('says why it will not save a length of zero', async () => {
    const { onSave } = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Must be more than zero');
  });

  // The read renders the server's reason; this only has to keep the value alive so the
  // correction can be adjusted rather than retyped from the old one.
  it('stays open holding the typed length when the save is refused', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('too short'));
    render(<InlineLengthEdit value={272} isAudio={false} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit length' }));
    await userEvent.clear(screen.getByLabelText('length'));
    await userEvent.type(screen.getByLabelText('length'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Save length' }));

    expect(onSave).toHaveBeenCalledWith(100);
    expect(await screen.findByLabelText('length')).toHaveValue('100');
    expect(screen.queryByRole('button', { name: 'Edit length' })).not.toBeInTheDocument();
  });
});
