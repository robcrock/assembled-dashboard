"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/select"
import type { EnumOption } from "@workspace/ui/components/enum-select"
import type { EditorProps } from "@workspace/ui/lib/editor"
import { cn } from "@workspace/ui/lib/utils"

// The edit face of a membership list (string[]) — the editor a `multiselect`
// column type resolves to; the dashboard's consumer is an agent's queue
// skills. Composes the vendored Select in Base UI's `multiple` mode: the
// popup stays open across picks (each pick toggles membership via onChange),
// so the commit grammar shifts from "a pick is the intent" (EnumSelect) to
// "CLOSING the picker is the intent": any close commits the draft —
// except an escape-key close, which maps to onCancel. Containers running a
// batched form omit both, per the contract.
//
// The trigger summarizes the value: up to two labels verbatim, then a count
// ("3 selected") — a cell-width control, not a chip garden. Chips-with-
// remove-buttons are deliberately omitted: removal is re-toggling the item
// in the list, one interaction instead of two to learn.

interface MultiSelectFieldEditorProps<V extends string> extends EditorProps<
  V[]
> {
  options: readonly EnumOption<V>[]
  placeholder?: string
}

function MultiSelectFieldEditor<V extends string>({
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
  options,
  placeholder = "Select…",
}: MultiSelectFieldEditorProps<V>) {
  const selected = options.filter((option) => value.includes(option.value))
  return (
    <Select
      multiple
      value={value}
      onValueChange={(next) => onChange(next as V[])}
      onOpenChange={(open, details) => {
        if (open) return
        if (details.reason === "escape-key") onCancel?.()
        // The popup stays open across picks, so every pick has rendered by the
        // time it closes and `value` IS the draft being committed.
        else onCommit?.(value)
      }}
      disabled={disabled}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
    >
      <SelectTrigger
        id={id}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          // Closed-popup Escape = revert intent (open-popup Escape rides
          // onOpenChange); Enter/Space stay native and open the picker.
          if (event.key === "Escape" && onCancel) {
            event.preventDefault()
            onCancel()
          }
        }}
        className={cn("w-full", className)}
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : selected.length <= 2 ? (
          <span className="flex items-center gap-1.5 truncate">
            {selected.map((option, i) => (
              <span key={option.value} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>·</span>}
                {option.label}
              </span>
            ))}
          </span>
        ) : (
          <span>{selected.length} selected</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { MultiSelectFieldEditor }
