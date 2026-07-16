"use client"

import { Input } from "@workspace/ui/components/input"
import { editorKeyDown, type EditorProps } from "@workspace/ui/lib/editor"

// The edit face of a plain-text value — the editor a `text` column type
// resolves to. Composes the vendored Input (as-shipped focus/invalid optics)
// and adds exactly two things: the EditorProps contract and the shared
// keyboard grammar (Enter commits, Escape cancels). Commit-on-blur is
// deliberately NOT wired here — blur policy belongs to the container (see
// lib/editor.ts), which is what lets this editor sit in a field cell that
// commits on focus-out beside a picker cell that must ignore blur.

interface TextFieldEditorProps extends EditorProps<string> {
  placeholder?: string
  maxLength?: number
}

function TextFieldEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  autoFocus,
  disabled,
  invalid,
  id,
  "aria-label": ariaLabel,
  className,
  placeholder,
  maxLength,
}: TextFieldEditorProps) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={editorKeyDown(value, onCommit, onCancel)}
      autoFocus={autoFocus}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      id={id}
      aria-label={ariaLabel}
      placeholder={placeholder}
      maxLength={maxLength}
      className={className}
    />
  )
}

export { TextFieldEditor }
