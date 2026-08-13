import type { ComponentProps } from 'react';
import { HhmmInput } from '@/components/common/hhmm-input';
import { Input } from '@/components/ui/input';

// The field both position sheets take their value in: a masked HH:MM box for an audio
// read, a numeric text box for a print one. Which of the two it is follows from the read's
// format, so the swap belongs here rather than at each sheet.
//
// The props mirror HhmmInput's own -- everything Input takes except the four this decides,
// plus `onValueChange` -- so a caller passes `id`, `className`, `disabled`, focus handlers
// and `aria-invalid` straight through and neither branch needs a prop list of its own.
//
// `type="text"` with `inputMode="numeric"` rather than `type="number"`: a number input
// brings spinners and a scroll-to-change behaviour that a page count does not want, and
// its value is the empty string for anything unparseable, which loses what was typed.
type PositionInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  isAudio: boolean;
  value: string;
  onValueChange: (value: string) => void;
};

export function PositionInput({ isAudio, value, onValueChange, ...props }: PositionInputProps) {
  if (isAudio) {
    return <HhmmInput value={value} onValueChange={onValueChange} {...props} />;
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="---"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      {...props}
    />
  );
}
