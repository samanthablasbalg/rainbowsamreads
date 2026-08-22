import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/render';
import { NoteField } from './note-field';

function ControlledNoteField({
  initial = '',
  defaultOpen,
}: {
  initial?: string;
  defaultOpen?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return <NoteField id="note" value={value} onValueChange={setValue} defaultOpen={defaultOpen} />;
}

describe('NoteField', () => {
  it('starts collapsed behind an affordance', () => {
    render(<ControlledNoteField />);

    expect(screen.getByRole('button', { name: '+ Add a note' })).toBeVisible();
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument();
  });

  it('reveals the textarea and focuses it on click', async () => {
    render(<ControlledNoteField />);

    await userEvent.click(screen.getByRole('button', { name: '+ Add a note' }));

    expect(screen.getByLabelText('Note')).toHaveFocus();
  });

  it('starts open with existing text when defaultOpen is set, without stealing focus', () => {
    render(<ControlledNoteField initial="A striking quote." defaultOpen />);

    expect(screen.getByLabelText('Note')).toHaveValue('A striking quote.');
    expect(screen.getByLabelText('Note')).not.toHaveFocus();
    expect(screen.queryByRole('button', { name: '+ Add a note' })).not.toBeInTheDocument();
  });

  it('reports typed text back to the caller', async () => {
    render(<ControlledNoteField />);

    await userEvent.click(screen.getByRole('button', { name: '+ Add a note' }));
    await userEvent.type(screen.getByLabelText('Note'), 'A striking quote.');

    expect(screen.getByLabelText('Note')).toHaveValue('A striking quote.');
  });
});
