import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { PositionInput } from '@/components/common/position-input';
import { Button } from '@/components/ui/button';
import { formatPosition, parsePosition } from '@/utils/position';
import { EDITABLE_VALUE_CLASS } from './editable-value';

type InlineLengthEditProps = {
  value: number | null;
  // Pages against minutes, the same split the log sheet reads its denominator on.
  isAudio: boolean;
  onSave: (value: number) => void;
};

export function InlineLengthEdit({ value, isAudio, onSave }: InlineLengthEditProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <LengthEditor
        value={value}
        isAudio={isAudio}
        onSave={(next) => {
          setEditing(false);
          onSave(next);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Button
      variant="link"
      className={EDITABLE_VALUE_CLASS}
      aria-label="Edit length"
      onClick={() => setEditing(true)}
    >
      {lengthLabel(value, isAudio)}
    </Button>
  );
}

// The unit rides along with the number, since the header no longer names the field.
// A duration says what it is on its own; a bare page count doesn't.
function lengthLabel(value: number | null, isAudio: boolean) {
  if (value === null) return '—';
  return isAudio ? formatPosition(value, true) : `${value} pages`;
}

function LengthEditor({
  value,
  isAudio,
  onSave,
  onCancel,
}: {
  value: number | null;
  isAudio: boolean;
  onSave: (value: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value === null ? '' : formatPosition(value, isAudio));

  function save() {
    if (draft.trim() === '') return onCancel();
    const parsed = parsePosition(draft, isAudio);
    // Nothing to save and nothing to correct on the server's behalf, so the editor stays
    // open with the bad value in it rather than discarding what was typed.
    if (parsed === null || parsed <= 0) return;
    onSave(parsed);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <PositionInput
        autoFocus
        className="h-8 w-20"
        isAudio={isAudio}
        aria-label="length"
        value={draft}
        onValueChange={setDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
          if (event.key === 'Escape') onCancel();
        }}
      />
      <Button variant="ghost" size="icon-sm" aria-label="Save length" onClick={save}>
        <HugeiconsIcon icon={Tick02Icon} />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Cancel length edit" onClick={onCancel}>
        <HugeiconsIcon icon={Cancel01Icon} />
      </Button>
    </span>
  );
}
