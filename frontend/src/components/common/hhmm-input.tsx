import { type ChangeEvent, type ComponentProps, useLayoutEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

type HhmmInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

// Taking the *last* four digits is only right if every edit lands at the end. React
// restores the caret to where it sat in the pre-format string after a controlled
// re-render -- one character in, for the keystroke that grew "" into "00:01" -- so it
// gets put back here: after each commit, after a click that placed it mid-string, and
// on focus, where the browser parks it at the front or selects the whole value.
//
// `force` is what separates those. A selection the user made is theirs -- select-all
// then type replaces the field, select-all then delete empties it -- but the one the
// browser makes on focus is not, and leaving it is what puts the caret at the front of
// a field you are about to type into the right-hand end of.
function pinCaretToEnd(input: HTMLInputElement | null, force = false) {
  if (!input || document.activeElement !== input) return;
  if (!force && input.selectionStart !== input.selectionEnd) return;
  input.setSelectionRange(input.value.length, input.value.length);
}

// A masked HH:MM field: the colon is never typed. The last four digits entered are the
// whole state, re-rendered into HH:MM on every keystroke, so 1, 2, 3 reads 00:01 ->
// 00:12 -> 01:23, and backspace shifts them back the other way. Value in and out is the
// formatted string, which is what callers hold and what parseHhmmToMinutes takes.
//
// The mask runs off onChange rather than the onKeyDown it is usually written with.
// onKeyDown doesn't fire for many Android soft keyboards, and never fires for a
// programmatic edit -- Playwright's fill(), which the e2e page objects use on these
// fields, is one. Reading the input's own value back after the browser has applied an
// edit is the one path every input method goes through.
//
// Four digits is the entire buffer, so the field caps at 99:59. An all-zero buffer is
// the empty value rather than 00:00: with only digits to go on there is no telling "0"
// from "0000", and backspacing down to nothing has to get back to untouched. 00:00 is
// not a position or a length anything here accepts anyway.
//
// It does not make an invalid value impossible -- 00:73 is reachable, by typing 7 then
// 5 and as the state on the way to 07:30 -- so callers still parse and still show an
// error.
export function HhmmInput({ value, onValueChange, onFocus, onBlur, ...props }: HhmmInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // An empty field has no end for the caret to sit at: focusing one parks it at the left
  // edge, and the first digit then lands at the right, so the caret visibly jumps the
  // width of the field. While focused, an empty value renders as the zeroed mask
  // instead. The caller still holds '', so a sheet that opens on an untouched field
  // stays untouched -- no error, Save still disabled -- and blurring without typing
  // anything returns it to the placeholder.
  const display = value === '' && focused ? '00:00' : value;

  useLayoutEffect(() => pinCaretToEnd(inputRef.current), [display]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, '').slice(-4).padStart(4, '0');
    onValueChange(digits === '0000' ? '' : `${digits.slice(0, 2)}:${digits.slice(2)}`);
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      placeholder="--:--"
      {...props}
      value={display}
      onChange={handleChange}
      onFocus={(event) => {
        setFocused(true);
        // A seeded value is already rendered, so it pins here. An empty one only gets
        // its mask on the next render, and the layout effect above pins that.
        pinCaretToEnd(event.currentTarget, true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onClick={() => pinCaretToEnd(inputRef.current)}
    />
  );
}
