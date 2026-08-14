import { type ChangeEvent, type ComponentProps, useLayoutEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

type HhmmInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

function pinCaretToEnd(input: HTMLInputElement | null, force = false) {
  if (!input || document.activeElement !== input) return;
  if (!force && input.selectionStart !== input.selectionEnd) return;
  input.setSelectionRange(input.value.length, input.value.length);
}

export function HhmmInput({ value, onValueChange, onFocus, onBlur, ...props }: HhmmInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

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
