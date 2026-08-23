import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { NoteMarkdown } from '@/components/common/note-markdown';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

type NoteFieldProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

export function NoteField({ id, value, onValueChange, disabled }: NoteFieldProps) {
  const [hasInitialValue] = useState(() => value.trim() !== '');
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasMounted = useRef(false);

  // Only a click into edit mode (empty -> "+ Add a note", or existing -> "Edit") should
  // steal focus -- never the initial render, which would otherwise autofocus the textarea
  // for a fresh, empty entry before the fields above it have been touched.
  useEffect(() => {
    if (hasMounted.current && editing) {
      textareaRef.current?.focus();
    }
    hasMounted.current = true;
  }, [editing]);

  if (editing) {
    return (
      <Field>
        <FieldLabel htmlFor={id}>Note</FieldLabel>
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </Field>
    );
  }

  if (hasInitialValue) {
    return (
      <Field>
        <div className="flex items-center justify-between gap-2">
          <FieldTitle>Note</FieldTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label="Edit note"
            onClick={() => setEditing(true)}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} data-icon="inline-start" />
            Edit
          </Button>
        </div>
        <div className="rounded-xl bg-muted p-3 text-base md:text-sm">
          <NoteMarkdown>{value}</NoteMarkdown>
        </div>
      </Field>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 self-start"
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      + Add a note
    </Button>
  );
}
