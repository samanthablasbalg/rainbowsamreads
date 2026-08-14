import type { ComponentProps } from 'react';
import { HhmmInput } from '@/components/common/hhmm-input';
import { Input } from '@/components/ui/input';

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
