"use client"

import * as React from "react"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"

import {
  reduceCell,
  type CellEvent,
  type CellTransition,
  type EditSlot,
} from "./cell-state"
import type { DataTableInteractive } from "./data-table"

// The interactive face of DataTable — the module the orchestrator composes
// when a consumer passes `interactive`. A SIBLING, not a wrapper: the public
// API stays DataTable's one flat prop surface, and this file is deliberately
// absent from index.ts, so every export below is package-private (the
// exports map only exposes each component folder's index.ts).
//
// The state split (the ownership ladder's bottom rungs): EDIT MODE is the
// consumer's — it couples to page concerns (the dashboard pauses replay) —
// via controlled `editing`/`onEditingChange`, with an uncontrolled internal
// default so Storybook and simple consumers need no wiring. Everything
// SESSION-scoped lives here in useTableInteraction: the selection set, and
// the ONE open cell edit. Two concepts that must not merge: SELECTION is
// sticky and multi (it drives the bulk bar); the open EDIT is transient and
// single. Exiting edit mode drops all of it.
//
// This file no longer knows what an edit LOOKS like. It holds the slot and
// runs gestures through the machine (cell-state.ts); the box, the control and
// the three states live in cell-content.tsx, and a column's `cell` writes the
// anatomy once. What used to be here — a five-way `resolveEditFace`, an
// `EditableCell` that branched on `Boolean(face.editCell)` to pick a layout,
// and a per-tick `createElement` that remounted the live control on every poll
// — is deleted, not moved.
//
// EDITING IS ONE GESTURE: click the value you mean. There is no row menu and
// no batched row form. An editable value rests as a BOX (the box IS the
// affordance), so edit mode telegraphs what can change before a click, and
// clicking swaps the box's face for the live control in place, at the same
// size. A compound cell boxes only its editable part, since only that part is
// editable. One meaning, everywhere: a box is a value you can change.
//
// DataTable never mutates: every commit lands as one
// `onPatch(rowKey, { field: value }, row)` and every removal as one
// `onDelete(rowKeys, rows)`. Undo, confirm, optimistic overlays are the
// consumer's policy, deliberately: this layer produces INTENTS.

/**
 * Lead-cell width when the interactive gutter is present: just the selection
 * checkbox. Deliberately the same step as EXPANDER_COL — the gutter takes the
 * caret's slot in edit mode, so matching widths keep the toggle from shifting
 * the columns under the pointer.
 */
export const INTERACTIVE_COL = "w-10"

/* ---- state ---------------------------------------------------------------
 * Session state only; rendering lives in the pieces below. Like the sort
 * and expansion hooks, this must sit above the feed-status switch — an
 * active edit surviving a loading tick is the same contract as an open row.
 * ------------------------------------------------------------------------ */

export function useTableInteraction<Row>(
  interactive: DataTableInteractive<Row> | undefined
) {
  const [internalEditing, setInternalEditing] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  // Range anchor: the last key toggled alone — Shift+click / Shift+Arrow
  // extend from it, the familiar file-manager grammar.
  const anchorRef = React.useRef<string | null>(null)
  // The ONE open cell edit (cell-state.ts). One slot, so two open edits are
  // unrepresentable rather than merely discouraged. It lives here beside the
  // selection — above the feed-status switch — for the same reason the sort
  // and expansion hooks do: a draft must survive a loading tick.
  const [slot, setSlot] = React.useState<EditSlot | null>(null)
  const [announcement, setAnnouncement] = React.useState("")

  const enabled = Boolean(interactive)
  const editing = enabled && (interactive?.editing ?? internalEditing)

  function setEditing(next: boolean) {
    interactive?.onEditingChange?.(next)
    if (interactive?.editing === undefined) setInternalEditing(next)
    if (!next) {
      // Leaving edit mode drops the whole session — selection, active edit.
      // Mode gates capability; nothing interactive outlives it.
      setSelected(new Set())
      setSlot(null)
      anchorRef.current = null
    }
  }

  /**
   * Run one gesture through the machine. Returns the transition so the caller
   * can emit the patch — the reducer is pure and stays that way; the effect is
   * the orchestrator's, where the rows and `onPatch` actually live.
   *
   * Reducing against the RENDERED slot is safe precisely because a `commit`
   * event carries its own draft: a picker fires onChange + onCommit in one
   * tick, so this `slot` is a render behind at that moment, and only the
   * address is read from it. See cell-state.ts.
   */
  function dispatchCell(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous across columns by nature
    event: CellEvent<any, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): CellTransition<any> {
    const transition = reduceCell(slot, event)
    if (transition.slot !== slot) setSlot(transition.slot)
    return transition
  }

  function announce(message: string) {
    setAnnouncement(message)
  }

  function toggleSelect(key: string, orderedKeys: string[], range: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      const anchor = anchorRef.current
      if (range && anchor !== null && anchor !== key) {
        const from = orderedKeys.indexOf(anchor)
        const to = orderedKeys.indexOf(key)
        if (from !== -1 && to !== -1) {
          for (const k of orderedKeys.slice(
            Math.min(from, to),
            Math.max(from, to) + 1
          )) {
            next.add(k)
          }
          setAnnouncement(`${next.size} selected`)
          return next
        }
      }
      if (next.has(key)) next.delete(key)
      else next.add(key)
      anchorRef.current = key
      setAnnouncement(
        next.size === 0 ? "Selection cleared" : `${next.size} selected`
      )
      return next
    })
  }

  function setAllSelected(keys: string[] | null) {
    anchorRef.current = null
    setSelected(keys === null ? new Set() : new Set(keys))
    setAnnouncement(
      keys === null || keys.length === 0
        ? "Selection cleared"
        : `All ${keys.length} selected`
    )
  }

  return {
    enabled,
    editing,
    setEditing,
    selected,
    toggleSelect,
    setAllSelected,
    slot,
    setSlot,
    dispatchCell,
    announcement,
    announce,
  }
}

/**
 * No `Row` parameter, and that is a result rather than an omission: the
 * session state is now selection keys and one address-keyed slot — strings,
 * both. The row-shaped half (an active edit holding a typed draft, a map of
 * resolved edit faces per column) is gone, so nothing here is generic in the
 * row any more.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the hook's own Row is unused by its return; see above
export type TableInteraction = ReturnType<typeof useTableInteraction<any>>

/* ---- pieces (in render order) -------------------------------------------- */

interface InteractionToolbarProps {
  editing: boolean
  onToggleEditing: (next: boolean) => void
  /**
   * Render the built-in Edit/Done toggle. False when the consumer mounts its
   * own (the dashboard's section headers own it) — the toolbar then carries
   * only the selection affordances, and entering/leaving is the consumer's.
   */
  showToggle: boolean
  /** Render the built-in "Clear rows". False when the consumer mounts its own. */
  showClearRows: boolean
  selectionCount: number
  onClearSelection: () => void
  onDeleteSelected: (() => void) | null
  onClearRows: (() => void) | null
  /** Rows exist to act on — Clear rows hides against an empty table. */
  hasRows: boolean
}

/**
 * The container zone. Reading face: one quiet "Edit" affordance (or nothing,
 * when the consumer owns the toggle). Editing face: Done + Clear rows —
 * replaced by the bulk bar (count + Delete selected) the moment a selection
 * exists, the selection-bar convention.
 */
export function InteractionToolbar({
  editing,
  onToggleEditing,
  showToggle,
  showClearRows,
  selectionCount,
  onClearSelection,
  onDeleteSelected,
  onClearRows,
  hasRows,
}: InteractionToolbarProps) {
  if (!editing) {
    if (!showToggle) return null
    return (
      <Button variant="outline" size="sm" onClick={() => onToggleEditing(true)}>
        <Pencil aria-hidden className="size-3.5" />
        Edit
      </Button>
    )
  }

  // Nothing to say: the consumer owns both the toggle and Clear rows, and no
  // selection exists yet. Render NOTHING rather than an empty row — a strip
  // that appears on mode entry moves the whole page under the operator.
  const bulkBar = selectionCount > 0
  const ownClearRows = showClearRows && onClearRows && hasRows
  if (!bulkBar && !ownClearRows && !showToggle) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectionCount > 0 ? (
        <>
          <span className="px-1 text-metric-sm text-muted-foreground">
            {selectionCount} selected
          </span>
          {onDeleteSelected && (
            <Button variant="outline" size="sm" onClick={onDeleteSelected}>
              <Trash2 aria-hidden className="size-3.5" />
              Delete selected
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear selection
          </Button>
        </>
      ) : (
        ownClearRows && (
          <Button variant="outline" size="sm" onClick={onClearRows}>
            <Trash2 aria-hidden className="size-3.5" />
            Clear rows
          </Button>
        )
      )}
      {showToggle && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onToggleEditing(false)}
        >
          Done
        </Button>
      )}
    </div>
  )
}

interface SelectAllCheckboxProps {
  total: number
  selectedCount: number
  onChange: (keys: string[] | null) => void
  orderedKeys: string[]
}

export function SelectAllCheckbox({
  total,
  selectedCount,
  onChange,
  orderedKeys,
}: SelectAllCheckboxProps) {
  const all = total > 0 && selectedCount >= total
  return (
    <Checkbox
      aria-label={all ? "Deselect all rows" : "Select all rows"}
      checked={all}
      indeterminate={selectedCount > 0 && !all}
      onCheckedChange={(checked) => onChange(checked ? orderedKeys : null)}
    />
  )
}

interface RowGutterCellProps {
  /** Human name for this row ("Billing"), labelling the checkbox. */
  label: string
  isSelected: boolean
  onToggleSelect: (range: boolean) => void
  onExtendSelect: (direction: 1 | -1) => void
}

/**
 * The row zone: selection, and only selection. There is no row menu —
 * editing is a click on the cell you mean, and removal routes through the
 * selection the bulk bar already reads, so a per-row menu would be a second
 * road to two places you can already get. The checkbox carries the range
 * grammar — Shift+click, and Shift+Arrow extending from the anchor while
 * focus is on it.
 */
export function RowGutterCell({
  label,
  isSelected,
  onToggleSelect,
  onExtendSelect,
}: RowGutterCellProps) {
  return (
    <Checkbox
      aria-label={`Select ${label}`}
      checked={isSelected}
      onCheckedChange={() => onToggleSelect(false)}
      onClick={(event: React.MouseEvent) => {
        if (event.shiftKey) {
          event.preventDefault()
          onToggleSelect(true)
        }
      }}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.shiftKey && event.key === "ArrowDown") {
          event.preventDefault()
          onExtendSelect(1)
        } else if (event.shiftKey && event.key === "ArrowUp") {
          event.preventDefault()
          onExtendSelect(-1)
        }
      }}
    />
  )
}

/** Screen-reader announcement surface for selection and removal — visual feedback is the row states themselves. */
export function InteractionAnnouncer({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="sr-only">
      {message}
    </div>
  )
}
