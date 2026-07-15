"use client"

import { Input } from "@workspace/ui/components/input"
import { editorKeyDown, type EditorProps } from "@workspace/ui/lib/editor"
import { cn } from "@workspace/ui/lib/utils"

// The edit face of a numeric value — the editor `number`, `duration`, and
// `delta` column types resolve to. Composes the vendored Input; adds the
// EditorProps contract, the shared keyboard grammar, tabular figures (a
// draft number should line up exactly like the metric it edits), and an
// optional UNIT suffix ("s", "%", "/15m") so the draft keeps the metric's
// meaning without the container re-explaining it.
//
// The value is `number | null` — an emptied field is a real draft state
// (null), not zero. Whether null may COMMIT (a required field) is container
// validation, surfaced back through `invalid`; min/max ride to the native
// input, but enforcement is likewise the container's at commit time.
// Spinner buttons are stripped: in a dense cell they add 20px of chrome to
// do what typing already does.

interface NumberFieldEditorProps extends EditorProps<number | null> {
  /** Muted suffix rendered inside the field ("s", "%"). Meaning, not chrome — keep it to a few characters. */
  unit?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

function NumberFieldEditor({
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
  unit,
  min,
  max,
  step,
  placeholder,
}: NumberFieldEditorProps) {
  return (
    <span className={cn("relative inline-flex w-full", className)}>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value
          if (raw === "") {
            onChange(null)
            return
          }
          const next = event.target.valueAsNumber
          if (!Number.isNaN(next)) onChange(next)
        }}
        onKeyDown={editorKeyDown(onCommit, onCancel)}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        id={id}
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={cn(
          "[appearance:textfield] text-metric [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          unit && "pr-8"
        )}
      />
      {unit && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-metric-sm text-muted-foreground"
        >
          {unit}
        </span>
      )}
    </span>
  )
}

export { NumberFieldEditor }
