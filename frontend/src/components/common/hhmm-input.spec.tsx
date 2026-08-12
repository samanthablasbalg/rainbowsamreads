import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@/test/render';
import { HhmmInput } from './hhmm-input';

// The mask is only observable through a controlled parent: each keystroke's formatted
// value is what the next keystroke is applied to.
function ControlledHhmmInput({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <HhmmInput aria-label="Position" value={value} onValueChange={setValue} />;
}

function renderInput(initial?: string) {
  render(<ControlledHhmmInput initial={initial} />);
  return screen.getByRole<HTMLInputElement>('textbox', { name: 'Position' });
}

describe('HhmmInput', () => {
  it('shifts each typed digit in from the right', async () => {
    const field = renderInput();

    await userEvent.type(field, '1');
    expect(field).toHaveValue('00:01');

    await userEvent.type(field, '2');
    expect(field).toHaveValue('00:12');

    await userEvent.type(field, '3');
    expect(field).toHaveValue('01:23');

    await userEvent.type(field, '0');
    expect(field).toHaveValue('12:30');
  });

  it('drops the oldest digit once the buffer is full', async () => {
    const field = renderInput();

    await userEvent.type(field, '12345');

    expect(field).toHaveValue('23:45');
  });

  it('shifts back out to the right on backspace', async () => {
    const field = renderInput();

    await userEvent.type(field, '123');
    await userEvent.type(field, '{Backspace}');

    expect(field).toHaveValue('00:12');
  });

  // Backspacing the last digit out has to leave the caller holding '' rather than a
  // 00:00 it would treat as an entered position -- visible once the field is blurred and
  // the focused mask drops away.
  it('empties back out rather than resting on 00:00', async () => {
    const field = renderInput();

    await userEvent.type(field, '1{Backspace}');
    // act, because blurring flips the focused state the mask is rendered off.
    act(() => field.blur());

    expect(field).toHaveValue('');
  });

  it('ignores a typed colon, so the same string a caller stores can be typed back', async () => {
    const field = renderInput();

    await userEvent.type(field, '02:30');

    expect(field).toHaveValue('02:30');
  });

  it('accepts a value set in one go, the way an e2e fill() sets it', async () => {
    const field = renderInput();

    // fireEvent-level assignment rather than keystrokes: Playwright's fill() sets the
    // whole value and dispatches one input event, and the mask has to survive that.
    await userEvent.click(field);
    await userEvent.paste('02:30');

    expect(field).toHaveValue('02:30');
  });

  it('reformats an edit to a seeded value from the right', async () => {
    const field = renderInput('02:05');

    await userEvent.type(field, '5');

    expect(field).toHaveValue('20:55');
  });

  // focus(), not userEvent.tab(): a browser applies its tab-focus select-all before
  // dispatching focus, so the handler collapsing it wins -- verified in Chromium via
  // hhmm-input.stories.tsx. user-event applies that selection *after* focus, so tabbing
  // here would measure user-event's ordering rather than the field's behaviour.
  it('puts the caret at the end when the field takes focus', () => {
    const field = renderInput('02:05');

    field.focus();

    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(5);
    expect(field.selectionEnd).toBe(5);
  });

  // The reason the mask appears at all: an empty field parks the caret at its left edge
  // while the first digit lands at the right, so the caret jumps the field's width.
  it('renders the zeroed mask while an empty field is focused', () => {
    const field = renderInput();

    act(() => field.focus());

    expect(field).toHaveValue('00:00');
    expect(field.selectionStart).toBe(5);
  });

  it('drops the mask again when an untouched field is blurred', () => {
    const field = renderInput();

    act(() => field.focus());
    act(() => field.blur());

    expect(field).toHaveValue('');
  });

  it('lets an invalid minute be typed, leaving the error to the caller', async () => {
    const field = renderInput();

    await userEvent.type(field, '75');

    expect(field).toHaveValue('00:75');
  });
});
