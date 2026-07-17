"use client"

import type * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/select"
import type { EditorProps } from "@workspace/ui/lib/editor"
import { cn } from "@workspace/ui/lib/utils"

// The edit face of a one-of-N value — the editor an `enum` column type (and
// the preferred-component types built on it: status, agentState) resolves
// to. Composes the vendored Select; the generic V keeps the chosen value on
// the SAME union the display primitive renders (StatusBadge's Status, the
// agent-state union), so view and editor cannot drift apart.
//
// Keyboard grammar adapts to a picker: PICKING an option is the explicit
// save intent (onChange then onCommit — Enter or click on an item), and
// Escape maps to onCancel whether the popup is open (close reason
// "escape-key") or the trigger is focused closed. Containers running a
// batched form simply omit onCommit/onCancel, per the contract.

/** One choosable value. The label may be a rich node — e.g. the display primitive itself (a StatusBadge), so the picker previews exactly what the cell will show. */
export interface EnumOption<V extends string> {
  value: V
  label: React.ReactNode
}

interface EnumSelectProps<V extends string> extends EditorProps<V> {
  options: readonly EnumOption<V>[]
  placeholder?: string
}

function EnumSelect<V extends string>({
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
}: EnumSelectProps<V>) {
  const selected = options.find((option) => option.value === value)
  return (
    <Select
      value={value}
      // A picker's reading of autoFocus is OPEN (lib/editor.ts). Mounting
      // focused-but-closed is why an inline cell felt broken: the click that
      // opened the edit was spent on the state change, and the control it
      // revealed was another closed button — so picking cost two clicks and
      // the first one looked like a no-op.
      defaultOpen={autoFocus}
      onValueChange={(next) => {
        // Single-select only emits null on programmatic clears, which this
        // editor never issues — a required enum has no "no value" pick.
        if (next === null) return
        // Both intents in one tick, so the commit carries `next` rather than
        // leaving the container to read a draft that has not rendered yet.
        onChange(next as V)
        onCommit?.(next as V)
      }}
      onOpenChange={(open, details) => {
        if (!open && details.reason === "escape-key") onCancel?.()
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
          // Closed-popup Escape = revert intent. Enter/Space stay native
          // (they OPEN the picker); open-popup Escape rides onOpenChange.
          if (event.key === "Escape" && onCancel) {
            event.preventDefault()
            onCancel()
          }
        }}
        className={cn("w-full", className)}
      >
        {selected ? (
          <span className="flex items-center gap-1.5">{selected.label}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
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

export { EnumSelect }
