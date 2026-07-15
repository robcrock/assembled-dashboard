"use client"

import * as React from "react"
import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import type { ColumnType } from "./column-types"
import type { DataTableColumn, DataTableInteractive } from "./data-table"

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
// SESSION-scoped lives here in useTableInteraction: the selection set, the
// one active inline edit, the one open row form. Two concepts that must not
// merge: SELECTION is sticky and multi (it drives the bulk bar); the ACTIVE
// EDIT is transient and single (innermost target wins). Exiting edit mode
// drops all of it.
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
// `onPatch(rowKey, { field: value }, row)` — the row form batches its
// changed fields into the same single call — and every removal as one
// `onDelete(rowKeys, rows)`. Undo, confirm, optimistic overlays are the
// consumer's policy, deliberately: this layer produces INTENTS.

/** Lead-cell width when the interactive gutter is present: checkbox + row menu. */
export const INTERACTIVE_COL = "w-16"

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
  return { field: edit.field, read, type }
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

interface RowForm {
  rowKey: string
  drafts: Record<string, unknown>
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
  const [rowForm, setRowForm] = React.useState<RowForm | null>(null)
  const [announcement, setAnnouncement] = React.useState("")

  const enabled = Boolean(interactive)
  const editing = enabled && (interactive?.editing ?? internalEditing)

  function setEditing(next: boolean) {
    interactive?.onEditingChange?.(next)
    if (interactive?.editing === undefined) setInternalEditing(next)
    if (!next) {
      // Leaving edit mode drops the whole session — selection, active edit,
      // open form. Mode gates capability; nothing interactive outlives it.
      setSelected(new Set())
      setActiveEdit(null)
      setRowForm(null)
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
    rowForm,
    setRowForm,
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
  selectionCount: number
  onClearSelection: () => void
  onDeleteSelected: (() => void) | null
  onClearRows: (() => void) | null
  /** Rows exist to act on — Clear rows hides against an empty table. */
  hasRows: boolean
}

/**
 * The container zone. Reading face: one quiet "Edit" affordance. Editing
 * face: Done + Clear rows — replaced by the bulk bar (count + Delete
 * selected) the moment a selection exists, the selection-bar convention.
 */
export function InteractionToolbar({
  editing,
  onToggleEditing,
  selectionCount,
  onClearSelection,
  onDeleteSelected,
  onClearRows,
  hasRows,
}: InteractionToolbarProps) {
  if (!editing) {
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
      <Button variant="default" size="sm" onClick={() => onToggleEditing(false)}>
        Done
      </Button>
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
  rowId: string
  /** Human name for this row ("Billing"), labelling the checkbox and menu. */
  label: string
  isSelected: boolean
  onToggleSelect: (range: boolean) => void
  onExtendSelect: (direction: 1 | -1) => void
  onEditRow: (() => void) | null
  onDuplicate: (() => void) | null
  onDelete: (() => void) | null
}

/**
 * The row zone: selection + the ⋮ row menu in one lead cell. The checkbox
 * carries the range grammar — Shift+click, and Shift+Arrow extending from
 * the anchor while focus is on it.
 */
export function RowGutterCell({
  rowId,
  label,
  isSelected,
  onToggleSelect,
  onExtendSelect,
  onEditRow,
  onDuplicate,
  onDelete,
}: RowGutterCellProps) {
  const hasMenu = Boolean(onEditRow || onDuplicate || onDelete)
  return (
    <span className="flex items-center gap-1">
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
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={`Row actions for ${label}`}
                className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground focus-ring hover:text-foreground"
              >
                <MoreVertical aria-hidden className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" id={`${rowId}-row-menu`}>
            {onEditRow && (
              <DropdownMenuItem onClick={onEditRow}>
                <Pencil aria-hidden className="size-3.5" />
                Edit row
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy aria-hidden className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 aria-hidden className="size-3.5" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </span>
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

  if (!isActive) {
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
        className="focus-ring -mx-1 flex w-full min-w-0 items-center rounded-sm px-1 py-0.5 text-left hover:bg-muted/60"
      >
        <span className="min-w-0 flex-1 truncate">{display}</span>
        <Pencil
          aria-hidden
          className="ml-1 size-3 shrink-0 text-muted-foreground/0 transition-colors [button:hover>&]:text-muted-foreground"
        />
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

  if (face.type.editorBehavior === "picker") {
    // Picker commit grammar: pick/close commits, Escape-close cancels — all
    // inside the editor already. Focus lives in a portal; blur is noise.
    return <div ref={wrapperRef}>{editor}</div>
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
      {editor}
    </div>
  )
}

interface RowEditFormProps<Row> {
  row: Row
  /** Human name for the row, heading the form. */
  label: string
  columns: DataTableColumn<Row>[]
  drafts: Record<string, unknown>
  onDraftChange: (field: string, draft: unknown) => void
  onSave: (patch: Record<string, unknown>) => void
  onCancel: () => void
}

/**
 * The row-level edit face, rendered in the expander's detail slot: every
 * editable column as a labeled field, one batched Save (a single onPatch
 * with the CHANGED fields only), Cancel discards. Per-field editors get no
 * onCommit — Enter must not half-save a form.
 */
export function RowEditForm<Row>({
  row,
  label,
  columns,
  drafts,
  onDraftChange,
  onSave,
  onCancel,
}: RowEditFormProps<Row>) {
  const fields = columns
    .map((column) => ({ column, face: resolveEditFace(column) }))
    .filter((f): f is { column: DataTableColumn<Row>; face: EditFace<Row> } =>
      Boolean(f.face)
    )

  const invalid = fields.some(({ face }) => {
    const draft = drafts[face.field]
    const from = face.type.fromDraft ?? ((d: unknown) => d)
    return from(draft) === null
  })

  function save() {
    const patch: Record<string, unknown> = {}
    for (const { face } of fields) {
      const draft = drafts[face.field]
      const from = face.type.fromDraft ?? ((d: unknown) => d)
      const next = from(draft)
      if (next !== null && next !== face.read(row)) patch[face.field] = next
    }
    onSave(patch)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-label text-muted-foreground">Edit {label}</div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {fields.map(({ column, face }) => {
          const draft = drafts[face.field]
          const from = face.type.fromDraft ?? ((d: unknown) => d)
          return (
            <div key={column.key} className="flex min-w-40 flex-col gap-1">
              <div className="text-label text-muted-foreground">
                {column.header}
              </div>
              {React.createElement(face.type.editor!, {
                value: draft,
                onChange: (next: unknown) => onDraftChange(face.field, next),
                onCancel,
                invalid: from(draft) === null,
                "aria-label":
                  typeof column.header === "string" ? column.header : column.key,
                className: "h-8",
              })}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={save} disabled={invalid}>
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
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
