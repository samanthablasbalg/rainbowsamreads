import { useState } from 'react';
import { PositionInput } from '@/components/common/position-input';
import { formatPosition, parsePosition } from '@/utils/position';
import { EditableValue, InlineEditor } from './inline-edit';

type InlineLengthEditProps = {
  value: number | null;
  isAudio: boolean;
  label?: string;
  onSave: (value: number) => Promise<unknown>;
};

export function InlineLengthEdit({
  value,
  isAudio,
  label = 'length',
  onSave,
}: InlineLengthEditProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <LengthEditor
        value={value}
        isAudio={isAudio}
        label={label}
        onSave={async (next) => {
          try {
            await onSave(next);
            setEditing(false);
          } catch {
            // The read shows the reason; the editor keeps what was typed so a length the
            // server refused can be adjusted rather than retyped from the old one.
          }
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <EditableValue label={label} onEdit={() => setEditing(true)}>
      {lengthLabel(value, isAudio)}
    </EditableValue>
  );
}

function lengthLabel(value: number | null, isAudio: boolean) {
  if (value === null) return '—';
  return isAudio ? formatPosition(value, true) : `${value} pages`;
}

function LengthEditor({
  value,
  isAudio,
  label,
  onSave,
  onCancel,
}: {
  value: number | null;
  isAudio: boolean;
  label: string;
  onSave: (value: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value === null ? '' : formatPosition(value, isAudio));
  const [attempted, setAttempted] = useState(false);

  const parsed = parsePosition(draft, isAudio);
  let error: string | null = null;
  if (attempted) {
    if (parsed === null) error = isAudio ? 'Enter a time in HH:MM format' : 'Enter a number';
    else if (parsed <= 0) error = 'Must be more than zero';
  }

  function save() {
    if (draft.trim() === '') return onCancel();
    if (parsed === null || parsed <= 0) return setAttempted(true);
    onSave(parsed);
  }

  return (
    <InlineEditor label={label} error={error} onSave={save} onCancel={onCancel}>
      <PositionInput
        autoFocus
        className="h-8 w-20"
        isAudio={isAudio}
        aria-label={label}
        aria-invalid={!!error}
        value={draft}
        onValueChange={setDraft}
      />
    </InlineEditor>
  );
}
