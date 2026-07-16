"use client"

import * as React from "react"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"

import type { ColumnType } from "./column-types"
import type { DataTableColumn, DataTableInteractive } from "./data-table"
import { EDIT_CELL_GROUP, EDIT_FIELD_FRAME } from "./edit-field-box"

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
// SESSION-scoped lives here in useTableInteraction: the selection set and
// the one active inline edit. Two concepts that must not merge: SELECTION is
// sticky and multi (it drives the bulk bar); the ACTIVE EDIT is transient
// and single (innermost target wins). Exiting edit mode drops all of it.
//
// EDITING IS ONE GESTURE: click a cell. There is no row menu and no batched
// row form — an editable cell rests as a FRAMED FIELD (the box IS the
// affordance), so edit mode telegraphs what's editable before a click, and
// clicking swaps the box for the live editor in place. A compound cell
// (editCell) frames only its editable sub-value, since only that part is a
// field. One meaning, everywhere: a box is a field.
//
// It follows that the BOX answers the hover, never the cell — in a compound
// cell the hit area is bigger than the field, so tinting the whole cell would
// point at the wrong thing (and a corner pencil, pinned away from the number
// it means, pointed at nothing). Hover anywhere in the cell, the box lights:
// the response names what a click would edit. See EDIT_CELL_GROUP.
//
// Commit policy is the container's (the editors are policy-agnostic —
// lib/editor.ts): field editors commit on Enter or on focus leaving the
// cell, cancel on Escape; picker editors (editorBehavior: "picker") commit
// on pick / popup close — focus legitimately leaves the cell into a portal,
// so blur means nothing there and the wrapper never watches it. A draft
// that fails `fromDraft` (null) never commits: Enter no-ops, blur reverts —
// the cell falls back to truth rather than inventing a value.
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

/* ---- edit-face resolution ------------------------------------------------
 * The one place a column resolves to "how does this cell edit": the column's
 * `edit` binding + its type. `true` binds the shown value (the column key IS
 * the patched field — pick keys accordingly); the object form is the
 * derived-display case, bringing its own field/reader/type.
 * ------------------------------------------------------------------------ */

export interface EditFace<Row> {
  /** The row field a commit patches. */
  field: string
  read: (row: Row) => unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous by nature
  type: ColumnType<any, any>
  /** Frames the live inline editor with read-only context (the object binding's `renderField`). */
  renderField?: (ctx: { row: Row; editor: React.ReactNode }) => React.ReactNode
  /** Resting inline-edit display for a compound cell; presence also selects BLOCK cell layout. */
  editCell?: (row: Row) => React.ReactNode
}

export function resolveEditFace<Row>(
  column: DataTableColumn<Row>
): EditFace<Row> | null {
  const { edit } = column
  if (!edit) return null
  if (edit === true) {
    if (!column.type?.editor || !column.get) return null
    return { field: column.key, read: column.get, type: column.type }
  }
  const type = edit.type ?? column.type
  const read = edit.get ?? column.get
  if (!type?.editor || !read) return null
  return {
    field: edit.field,
    read,
    type,
    renderField: edit.renderField,
    editCell: edit.editCell,
  }
}

/* ---- state ---------------------------------------------------------------
 * Session state only; rendering lives in the pieces below. Like the sort
 * and expansion hooks, this must sit above the feed-status switch — an
 * active edit surviving a loading tick is the same contract as an open row.
 * ------------------------------------------------------------------------ */

interface ActiveEdit {
  rowKey: string
  columnKey: string
  draft: unknown
}

export function useTableInteraction<Row>(
  interactive: DataTableInteractive<Row> | undefined
) {
  const [internalEditing, setInternalEditing] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  // Range anchor: the last key toggled alone — Shift+click / Shift+Arrow
  // extend from it, the familiar file-manager grammar.
  const anchorRef = React.useRef<string | null>(null)
  const [activeEdit, setActiveEdit] = React.useState<ActiveEdit | null>(null)
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
      setActiveEdit(null)
      anchorRef.current = null
    }
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
      setAnnouncement(next.size === 0 ? "Selection cleared" : `${next.size} selected`)
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
    activeEdit,
    setActiveEdit,
    announcement,
    announce,
  }
}

export type TableInteraction<Row> = ReturnType<
  typeof useTableInteraction<Row>
>

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectionCount > 0 ? (
        <>
          <span className="text-metric-sm text-muted-foreground px-1">
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
        onClearRows &&
        hasRows && (
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

/**
 * Flush editor face: fits inside the default 40px row rhythm (24px control +
 * cell padding) so opening an editor cannot grow the row. The `!` matters:
 * picker triggers size themselves through a `data-size` variant that would
 * otherwise beat a plain h-6 in the cascade.
 */
const CELL_EDITOR_CLASS = "!h-6 rounded-sm text-sm"

interface EditableCellProps {
  /** The display face rendered when this cell is not the active edit. */
  display: React.ReactNode
  /** Accessible name: "Edit <column>, <row>". */
  label: string
  isActive: boolean
  draft: unknown
  face: EditFace<never>
  /**
   * Wraps the active editor in the column's read-only context (the compound
   * cell's `renderField`, row already bound). Identity for a plain cell, so
   * clicking a compound cell keeps `48s / [input]` instead of a bare field.
   */
  frameEditor: (editor: React.ReactNode) => React.ReactNode
  onBegin: () => void
  onDraftChange: (draft: unknown) => void
  /** Receives the final draft value — see RowInteraction.commitEdit on why state can't be read at commit time. */
  onCommit: (finalDraft: unknown) => void
  onCancel: () => void
}

/**
 * The cell zone. Inactive: the display face on a full-bleed button — click
 * or Enter begins the edit (native button, so keyboard rides for free).
 * Active: the type's editor at cell-flush size; commit policy per
 * editorBehavior (see module comment).
 */
export function EditableCell({
  display,
  label,
  isActive,
  draft,
  face,
  frameEditor,
  onBegin,
  onDraftChange,
  onCommit,
  onCancel,
}: EditableCellProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  // The freshest draft, readable synchronously at commit time. A picker
  // fires onChange + onCommit in ONE tick — the state draft is a render
  // behind, so committing from state would silently no-op every pick.
  const liveDraft = React.useRef<unknown>(undefined)
  const hasLiveDraft = React.useRef(false)
  const wasActive = React.useRef(false)

  // Closing the editor hands focus back to the cell button — a keyboard
  // user stays where they were instead of falling to <body>.
  React.useEffect(() => {
    if (wasActive.current && !isActive) buttonRef.current?.focus()
    wasActive.current = isActive
  }, [isActive])

  function commit() {
    onCommit(hasLiveDraft.current ? liveDraft.current : draft)
  }

  // A compound cell (editCell present) owns a fixed-width, multi-part anatomy
  // whose annotation would clip under the single-line `truncate` affordance
  // the text cells use — so it renders BLOCK (full width, no clip). `display`
  // already carries the resting face DataRow resolved (editCell or cell).
  const block = Boolean(face.editCell)

  if (!isActive) {
    if (block) {
      return (
        <button
          ref={buttonRef}
          type="button"
          aria-label={label}
          onClick={() => {
            hasLiveDraft.current = false
            liveDraft.current = undefined
            onBegin()
          }}
          // Horizontally LAYOUT-NEUTRAL, deliberately: an `editCell` is written
          // to mirror the read cell, which sits directly in the td's content
          // box. Any padding here would silently shrink the box that anatomy
          // was authored against — its fixed-width bar then overflows and pokes
          // out past this button's own rounded edge. No margin, no px: the
          // compound cell occupies the SAME box reading and editing, so nothing
          // can escape it and the mode toggle moves nothing sideways.
          //
          // No hover tint and no pencil: the BOX is the affordance (it lights
          // via EDIT_CELL_GROUP), and this button is only the hit area. A cell
          // wash would say "editable" a second time, weakly, in the wrong place
          // — and it collided with the bar's muted track besides.
          className={cn(
            EDIT_CELL_GROUP,
            "focus-ring block w-full rounded-sm py-0.5 text-left"
          )}
        >
          {display}
        </button>
      )
    }
    // A simple cell's whole value IS the field, so the button IS the frame —
    // the same recipe, and the same hover response, a compound cell boxes its
    // editable sub-value with: one border means one thing everywhere.
    //
    // -mx-1 bleeds the frame into the cell's own padding: it buys back the
    // width the border + px would otherwise steal from the value (long names
    // truncated), and lands the text within a pixel or two of where read mode
    // puts it, so toggling the mode barely moves it.
    return (
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        onClick={() => {
          hasLiveDraft.current = false
          liveDraft.current = undefined
          onBegin()
        }}
        className={cn(
          "focus-ring -mx-1 flex w-full min-w-0 items-center text-left",
          EDIT_FIELD_FRAME
        )}
      >
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </button>
    )
  }

  // createElement, not a plain call: the editor face renders as a COMPONENT,
  // so its invocation is deferred to React (closures below are props/event
  // handlers, never render-phase calls — which is also what lets the ref
  // reads in commit() stay legal).
  const editor = React.createElement(face.type.editor!, {
    value: draft,
    onChange: (next: unknown) => {
      hasLiveDraft.current = true
      liveDraft.current = next
      onDraftChange(next)
    },
    onCommit: commit,
    onCancel,
    autoFocus: true,
    "aria-label": label,
    className: CELL_EDITOR_CLASS,
  })
  // Keep the compound cell's read-only context around the live field, so a
  // clicked Headroom cell reads `48s / [input]`, not a context-less number.
  const framed = frameEditor(editor)

  if (face.type.editorBehavior === "picker") {
    // Picker commit grammar: pick/close commits, Escape-close cancels — all
    // inside the editor already. Focus lives in a portal; blur is noise.
    return <div ref={wrapperRef}>{framed}</div>
  }

  return (
    <div
      ref={wrapperRef}
      onBlur={(event) => {
        // Focus left the cell (not just moved within it) — the field-editor
        // commit point. An uncommittable draft reverts to truth instead.
        if (!wrapperRef.current?.contains(event.relatedTarget as Node)) {
          commit()
        }
      }}
    >
      {framed}
    </div>
  )
}

/** True when the event target is a control that owns its own keystrokes — the `x` shortcut must not fire while typing. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.getAttribute("role") === "combobox"
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
