import { useState } from 'react';
import { PositionInput } from '@/components/common/position-input';
import { formatPosition, parsePosition } from '@/utils/position';
import { EditableValue, InlineEditor } from './inline-edit';

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
    <EditableValue label="length" onEdit={() => setEditing(true)}>
      {lengthLabel(value, isAudio)}
    </EditableValue>
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
    <InlineEditor label="length" onSave={save} onCancel={onCancel}>
      <PositionInput
        autoFocus
        className="h-8 w-20"
        isAudio={isAudio}
        aria-label="length"
        value={draft}
        onValueChange={setDraft}
      />
    </InlineEditor>
  );
}
