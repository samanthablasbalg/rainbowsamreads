import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatIsoDate } from '@/utils/format-date';
import { localIsoDate } from '@/utils/local-date';

type InlineDateEditProps = {
  value: string | null;
  // Names the thing being edited, lowercase, for the controls' accessible names:
  // "start date" gives "Edit start date" / "Save start date".
  label: string;
  disabled?: boolean;
  onSave: (value: string) => void;
};

// A date that reads as text until you touch it, then becomes an input in the same slot.
//
// A swap, not a reveal: the text and the editor never coexist, so a page that is otherwise
// read-only never carries an idle form control, and there is no editor left standing open
// behind you once you are done with it.
export function InlineDateEdit({ value, label, disabled = false, onSave }: InlineDateEditProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    // Mounted fresh each time, which is what re-seeds the draft from `value` -- state held
    // up here would still be showing the last edit's half-typed date on the second open.
    return (
      <DateEditor
        value={value}
        label={label}
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
      // Stripped back to the surrounding text: this sits mid-sentence in the header, and
      // the link variant's underline-on-hover is the whole affordance it needs.
      className="h-auto p-0 font-normal text-inherit"
      disabled={disabled}
      aria-label={`Edit ${label}`}
      onClick={() => setEditing(true)}
    >
      {value ? formatIsoDate(value) : '—'}
    </Button>
  );
}

function DateEditor({
  value,
  label,
  onSave,
  onCancel,
}: {
  value: string | null;
  label: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value ?? '');

  // Explicit rather than fired on change: a native date input emits a change for every
  // part you touch, so two of every three would be a half-typed date.
  function save() {
    // An emptied field cancels rather than clearing. The API does take null, but clearing
    // `started_on` moves the bound every log date is validated against -- a real action
    // with its own consequences, not something to fall out of backspacing.
    if (draft === '') return onCancel();
    onSave(draft);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="date"
        autoFocus
        className="h-8 w-auto"
        max={localIsoDate()}
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
          if (event.key === 'Escape') onCancel();
        }}
      />
      <Button variant="ghost" size="icon-sm" aria-label={`Save ${label}`} onClick={save}>
        <HugeiconsIcon icon={Tick02Icon} />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Cancel ${label} edit`} onClick={onCancel}>
        <HugeiconsIcon icon={Cancel01Icon} />
      </Button>
    </span>
  );
}
