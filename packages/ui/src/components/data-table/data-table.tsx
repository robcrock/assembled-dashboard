"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react"

import { EmptyState } from "@workspace/ui/components/empty-state"
import { ErrorState } from "@workspace/ui/components/error-state"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { StaleIndicator } from "@workspace/ui/components/stale-indicator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import type { Feed } from "@workspace/ui/lib/feed"
import { cn } from "@workspace/ui/lib/utils"

import {
  cellContentBuilder,
  type CellContentBuilder,
  type CellValueEvents,
} from "./cell-content"
import { projectEdit, type EditSlot } from "./cell-state"
import type { ColumnType } from "./column-types"
import {
  EditableCell,
  InteractionAnnouncer,
  InteractionToolbar,
  INTERACTIVE_COL,
  isTypingTarget,
  resolveEditFace,
  RowGutterCell,
  SelectAllCheckbox,
  useTableInteraction,
  type EditFace,
  type TableInteraction,
} from "./data-table-interactive"

// The dense, sortable table both dashboard tables are built from — configured
// entirely by a typed column config, so it renders Queues and Agents without
// knowing either. A single component taking columns + rows (NOT a compound
// component): the only shared state is one sort tuple, entirely internal —
// context machinery would give consumers nothing but wiring.
//
// Owns its loading/empty/error/stale rendering. Loading renders skeleton rows
// under the real header (no layout shift); stale dims the body and shows the
// StaleIndicator (opt out via staleNote where page chrome carries the one
// canonical note) but never blanks; error offers retry.
//
// Internal architecture (top-down in this file): DataTable is a thin
// orchestrator — state lives in two hooks (useTableSort, useExpandedKeys;
// they MUST stay in the orchestrator, above the feed-status switch, or an
// open row would collapse on every loading tick), and each state arm renders
// one named private piece (HeaderRow, SkeletonRows, ErrorRow, EmptyRow,
// DataRow). The pieces take explicit props, not context: they are depth-1
// children of the state owner, so there is no intermediate layer for a
// provider to skip — context here would be indirection with zero consumers.
// Nothing below the orchestrator is exported: index.ts `export *`s this
// file, so an `export` keyword IS the public API.

// One fixed rhythm per table for every body row — skeleton and resolved
// alike — so loading -> live cannot shift (the states contract) and row
// height stops depending on WHICH cell content sets the line-box. td height
// acts as MIN-height, which is the parity trap: content taller than the
// rhythm still grows the resolved row past the skeletons. So the contract
// has a consumer half — pick the rowSize step that CLEARS your tallest
// cell: "default" (40px) for single-line cells, "tall" (56px) for
// multi-line anatomies (deviation cells, stacked coverage lines). Both
// steps sit on the Braun 8px grid, and a rhythm that clears the content
// also makes ragged rows uniform.
const ROW_RHYTHM = { default: "h-10", tall: "h-14" } as const

// The expander lead column's one width. Header, skeleton, and data rows must
// agree on it or the columns shear — a shared constant makes that agreement
// structural (a shared cell COMPONENT would need a th/td switch plus content
// slots to save this one string). 40px = the size-6 toggle + the cell's p-2,
// so the column holds under layout="fixed" (auto layout resolved it to the
// same 40px anyway).
const EXPANDER_COL = "w-10"

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const

/**
 * How an editable column binds a commit target — read by `resolveEditFace`,
 * which turns it into the cell's edit face (the framed resting field, and
 * the editor a click swaps in).
 *
 * `true` means "edit the field the column shows" — valid only when the
 * column's value IS a stored field. The object form is the derived-display
 * case: a computed `get` is a read-only projection (nothing can invert it),
 * so the edit face binds its own `field` — the WRITE inverse — plus its own
 * reader and, when the edit value's shape differs from the shown one, its
 * own editor-bearing type (a status badge shown, its target-seconds edited).
 */
export type ColumnEdit<Row> =
  | boolean
  | {
      /** The row field a commit patches. */
      field: string
      /** Reads the edit value where it differs from the displayed one. Defaults to the column's `get`. */
      get?: (row: Row) => unknown
      /** Editor-bearing type for the edit value where its shape differs from the column's own. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous by nature; the helper binds precise types
      type?: ColumnType<any, any>
      /**
       * Frames the LIVE editor with read-only context, so a compound cell
       * keeps what it shows around the part it edits (`60 / [input]`) instead
       * of collapsing to a context-less box the moment it's clicked. Domain
       * data on the same row, so it's the column's to supply, not the type's.
       * Absent ⇒ the bare editor. Pair it with `editCell`, which is the same
       * anatomy at rest.
       */
      renderField?: (ctx: {
        row: Row
        editor: React.ReactNode
      }) => React.ReactNode
      /**
       * The RESTING inline-edit display — what the cell shows in edit mode
       * before it's clicked into. A compound cell (a fixed-width, multi-part
       * anatomy like the deviation cells) can't be squeezed through the
       * single-line `truncate` affordance the text cells use — its
       * right-aligned annotation clips. Providing `editCell` opts the cell
       * into BLOCK layout (full width, no clip) and lets the column say how
       * the editable field reads at rest. Absent ⇒ the column's normal
       * `cell`/view, in the inline text affordance.
       *
       * Box only what the cell will actually let you change (wrap it in
       * `EditFieldBox`), and leave the observed half bare: the frame is a
       * promise that a click edits that value. The cell's own box is the
       * td's, same as the read face — so an anatomy that fits `cell` fits here.
       */
      editCell?: (row: Row) => React.ReactNode
    }

// V defaults to `any`, not `unknown`: a heterogeneous column array must
// accept a ColumnType<Status> beside a ColumnType<number>, and strict
// function-property contravariance rejects both against `unknown`. The
// createColumns builders restore per-column precision at the call site.
export interface DataTableColumn<
  Row,
  Setting extends Extract<keyof Row, string> = never,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V = any,
> {
  /** Stable id; also the sort key. */
  key: string
  header: React.ReactNode
  /**
   * The column's one renderer — every state, one anatomy.
   *
   * `content` builds the parts an operator controls
   * (`content.duration({ edits: "sla_target_sec" })`); it reaches any depth
   * inside the anatomy because it is minted per (row, column) and closed over
   * the row, so no provider is involved and `packages/ui` keeps its
   * zero-`createContext` record.
   *
   * A read-only cell simply never writes the second parameter — which is why
   * every existing `cell: (row) => …` keeps working untouched: a function of
   * one argument is assignable to a signature of two.
   */
  cell?: (
    row: Row,
    content: CellContentBuilder<Row, Setting>
  ) => React.ReactNode
  /**
   * The column's value shape, resolved to both cell faces (view + editor)
   * and a default sort — see `columnTypes`. Pair with `get`.
   */
  type?: ColumnType<V>
  /** Reads the column's value off a row; the type's faces render it. */
  get?: (row: Row) => V
  /** Editability binding — presence makes the cell a field in edit mode. */
  edit?: ColumnEdit<Row>
  /**
   * Presence makes the column sortable; falls back to the type's default
   * projection (via `get`) when omitted.
   */
  sortValue?: (row: Row) => number | string
  align?: "left" | "right"
  /** Applied to both the header cell and body cells (widths, emphasis). */
  className?: string
}

/**
 * A column with its `Setting` erased — the type every PRIVATE helper below
 * speaks. The boundary is precise (`DataTableProps` takes
 * `DataTableColumn<Row, Setting>[]`, and that is where a call site's `edits`
 * keys are checked); inside, a heterogeneous column array is genuinely
 * heterogeneous, and threading each column's own Setting through the renderer
 * would buy a guarantee that was already made at the door.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- erased on purpose; see above
type AnyColumn<Row> = DataTableColumn<Row, any, any>

/** The one place a column resolves to sortability: its own `sortValue`, else the type's default projection over `get`. */
function sortAccessor<Row>(
  column: AnyColumn<Row>
): ((row: Row) => number | string) | undefined {
  if (column.sortValue) return column.sortValue
  const { type, get } = column
  if (type?.sortValue && get) {
    const project = type.sortValue
    return (row: Row) => project(get(row))
  }
  return undefined
}

/** The one place a column resolves to cell content: `cell` (escape hatch) wins over the type's view face. */
function cellContent<Row>(
  column: AnyColumn<Row>,
  row: Row,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous across the row's columns by nature
  content: CellContentBuilder<Row, any>
): React.ReactNode {
  if (column.cell) return column.cell(row, content)
  if (column.type && column.get) return column.type.view(column.get(row))
  return null
}

interface SortState {
  key: string
  direction: "asc" | "desc"
}

/**
 * The events a NON-interactive table hands its content builder. A read-only
 * table still mints the builder (a column's `cell` always receives its second
 * argument), but with `mode: false` every content it builds resolves to
 * `reading` — the gestures are unreachable, so these can never fire. Frozen
 * and module-level so a read-only table allocates nothing per cell.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- erased; unreachable while mode is false
const INERT_CELL_EVENTS: CellValueEvents<any, any> = Object.freeze({
  onOpen: () => {},
  onChange: () => {},
  onCommit: () => {},
  onCancel: () => {},
})

/**
 * The interactive face — presence enables it; a table without this prop is
 * the read-only DataTable unchanged, paying nothing. DataTable produces
 * INTENTS through these callbacks and never mutates or fetches; undo,
 * confirmation, and optimistic overlays are the consumer's policy, above.
 */
export interface DataTableInteractive<Row> {
  /**
   * One commit, one call: an inline cell edit arrives as a single-entry
   * patch. With `edit: true` the patched field is the column's `key`; the
   * object binding names its own `field`.
   */
  onPatch: (rowKey: string, patch: Record<string, unknown>, row: Row) => void
  /** Row removal intent — the selection (bulk bar) or all (Clear rows). Omit to hide every delete affordance. */
  onDelete?: (rowKeys: string[], rows: Row[]) => void
  /**
   * Controlled edit mode, for consumers whose mode couples to page state
   * (the dashboard pauses replay while editing). Omit both and the table
   * runs its own — the toolbar still works with zero wiring.
   */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  /**
   * Render the built-in Edit/Done toggle above the table (default true, so a
   * consumer passing nothing gets a working mode for free). False when the
   * page mounts its own — the dashboard's section headers carry it, where
   * section-level actions belong — leaving this toolbar the selection
   * affordances only. Pair it with controlled `editing`/`onEditingChange`,
   * or nothing can turn the mode on.
   */
  editToggle?: boolean
  /**
   * Render the built-in "Clear rows" button (default true). False when the
   * page mounts its own beside the toggle — the same reasoning as
   * `editToggle`, plus a layout one: with both suppressed, this toolbar holds
   * nothing until a selection exists, so ENTERING edit mode adds no strip
   * above the table and costs zero layout. A mode that shoves the page down
   * to announce itself reads as bigger than it is.
   */
  clearRows?: boolean
  /** Human name for a row ("Billing"), labelling its checkbox and announcements. Falls back to the row key. */
  rowLabel?: (row: Row) => string
}

interface DataTableProps<
  Row,
  Setting extends Extract<keyof Row, string> = never,
> {
  /**
   * `Setting` is inferred from this array — declare the columns as
   * `DataTableColumn<Queue, QueueSetting>[]` and every `edits` key in every
   * cell is checked against it. Left to default, `Setting` is `never`: a table
   * that declared no settings has no key it can pass, so the content builder's
   * edit methods are unreachable by construction rather than by discipline.
   */
  columns: DataTableColumn<Row, Setting>[]
  rows: Row[]
  rowKey: (row: Row) => string
  /** Screen-reader summary of what this table shows. */
  caption: string
  /** Feed condition; defaults to live. Drives loading/empty/error/stale. */
  feed?: Feed
  emptyTitle?: string
  emptyDescription?: string
  /**
   * Presence adds an expander column; each row toggles an inline detail panel
   * rendered from this callback. The idiomatic exception to "children over
   * renderX" — the content is row-dependent, so a callback is the honest API.
   * Return null for rows with nothing to expand (their toggle is omitted).
   */
  getExpandedContent?: (row: Row) => React.ReactNode
  /**
   * Row-specific accessible name for the expand toggle, so a screen-reader
   * user hears "Expand Billing coverage" rather than six identical "Expand
   * details". Falls back to "details" when omitted.
   */
  expandLabel?: (row: Row) => string
  defaultSort?: SortState
  skeletonRows?: number
  /**
   * Row rhythm for skeleton AND data rows — pick the step that clears your
   * tallest cell so loading→live cannot shift: "default" (40px) for
   * single-line cells, "tall" (56px) for multi-line cell anatomies.
   */
  rowSize?: "default" | "tall"
  /**
   * Column sizing. "auto" (default) lets content size the columns — right
   * for static rows. "fixed" (table-layout: fixed) sizes columns from the
   * header row alone, so live cell content that widens on a tick (a badge
   * gaining a suffix, a lever line appearing) can never reflow the grid —
   * the horizontal half of the no-shift contract. Pair it with a width
   * class per column (via column.className) that CLEARS that column's
   * widest realistic content; unsized columns split the remainder.
   */
  layout?: "auto" | "fixed"
  /**
   * Render the "Stale · updated Xs ago" note above the table when the feed
   * degrades (default true — the table stays self-contained). Pass false on
   * pages whose chrome already mounts the ONE canonical `StaleIndicator`: the
   * body dim still applies — honesty is not optional, repetition is.
   */
  staleNote?: boolean
  /** The interactive face — see `DataTableInteractive`. Absent ⇒ the read-only table, unchanged. */
  interactive?: DataTableInteractive<Row>
  className?: string
}

function DataTable<Row, Setting extends Extract<keyof Row, string> = never>({
  columns: precise,
  rows,
  rowKey,
  caption,
  feed = { status: "live" },
  emptyTitle = "Nothing to show",
  emptyDescription,
  getExpandedContent,
  expandLabel,
  defaultSort,
  skeletonRows = 5,
  rowSize = "default",
  layout = "auto",
  staleNote = true,
  interactive,
  className,
}: DataTableProps<Row, Setting>) {
  // The ONE erasure, at the door. Above this line a column's `edits` keys are
  // checked against the consumer's own `Setting`; below it, a heterogeneous
  // column array is genuinely heterogeneous and every private helper speaks
  // AnyColumn. Re-threading Setting through the renderer would re-prove a
  // guarantee already made here.
  const columns = precise as AnyColumn<Row>[]

  const { status, lastUpdatedAt = null, onRetry } = feed
  const { sortedRows, sort, toggleSort } = useTableSort(
    columns,
    rows,
    defaultSort
  )
  const expanded = useExpandedKeys()
  // Same above-the-switch rule as sort and expansion: an active edit and a
  // selection both survive a loading tick.
  const interaction = useTableInteraction(interactive)
  const { editing } = interaction

  // Column presence is table-level (the callback exists), independent of any
  // row's result — a table whose every row returns null still gets the column.
  const hasExpanderColumn = Boolean(getExpandedContent)
  // The caret is a reading affordance; edit mode swaps it for the interactive
  // gutter in the same lead slot. Gate on !editing so the column, header cell,
  // skeleton cell, and per-row toggle all disappear together — no shear. The
  // open-keys state is left intact, so leaving edit mode restores open rows.
  const showExpanderColumn = hasExpanderColumn && !editing
  // The interactive gutter exists only inside edit mode — mode gates
  // capability; the reading face stays column-identical to the plain table.
  // The reflow on toggle is a user action, not a tick, so no-shift holds.
  const colSpan =
    columns.length + (showExpanderColumn ? 1 : 0) + (editing ? 1 : 0)

  const editFaces = React.useMemo(() => {
    const faces = new Map<string, EditFace<Row>>()
    for (const column of columns) {
      const face = resolveEditFace(column)
      if (face) faces.set(column.key, face)
    }
    return faces
  }, [columns])

  const orderedKeys = sortedRows.map(rowKey)

  /* ---- the open cell edit ------------------------------------------------
   * A row can leave the feed on any tick, and a draft addressed to a row that
   * no longer exists would commit into nothing. `projectEdit` is pure and runs
   * in render; the state is then corrected in place so the drop is PERMANENT —
   * masking it here alone would let the edit reappear if the row came back,
   * with a draft from before it left. Adjusting state during render is React's
   * own sanctioned pattern for exactly this (it re-renders before committing,
   * and nothing below ever sees the dropped slot).
   * --------------------------------------------------------------------- */
  const liveRowKeys = new Set(orderedKeys)
  const activeSlot = projectEdit(interaction.slot, liveRowKeys)
  if (activeSlot !== interaction.slot) interaction.setSlot(activeSlot)

  const rowsByKey = new Map(sortedRows.map((row) => [rowKey(row), row]))

  /**
   * Where a commit stops being a state transition and becomes an INTENT. The
   * machine is pure and returns the patch; this is the only place that tells
   * the consumer, and it never mutates a row — undo, confirmation and the
   * optimistic overlay are all the consumer's policy, above.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous across columns by nature
  const cellEvents: CellValueEvents<any, any> = {
    onOpen: (address, behavior, value) =>
      interaction.dispatchCell({ type: "open", address, behavior, value }),
    onChange: (address, draft) =>
      interaction.dispatchCell({ type: "change", address, draft }),
    onCancel: (address) =>
      interaction.dispatchCell({ type: "cancel", address }),
    onCommit: (address, behavior, value, via, draft) => {
      const { patch } = interaction.dispatchCell({
        type: "commit",
        address,
        behavior,
        value,
        via,
        draft,
      })
      if (!patch) return
      const row = rowsByKey.get(address.rowKey)
      if (row) {
        interactive?.onPatch(
          address.rowKey,
          { [address.key]: patch.value },
          row
        )
      }
    },
  }

  // Toolbar shows wherever acting makes sense: live and stale (data is
  // present; stale edits are the consumer's data story). Never over a
  // skeleton or an error body.
  const showToolbar =
    interaction.enabled && (status === "live" || status === "stale")

  function deleteRows(keys: string[], targets: Row[], message: string) {
    interactive?.onDelete?.(keys, targets)
    interaction.setAllSelected(null)
    interaction.announce(message)
  }

  return (
    <div className={className}>
      {(showToolbar || (status === "stale" && staleNote)) && (
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            {showToolbar && (
              <InteractionToolbar
                editing={editing}
                onToggleEditing={interaction.setEditing}
                showToggle={interactive?.editToggle ?? true}
                showClearRows={interactive?.clearRows ?? true}
                selectionCount={interaction.selected.size}
                onClearSelection={() => interaction.setAllSelected(null)}
                onDeleteSelected={
                  interactive?.onDelete
                    ? () =>
                        deleteRows(
                          orderedKeys.filter((k) =>
                            interaction.selected.has(k)
                          ),
                          sortedRows.filter((r) =>
                            interaction.selected.has(rowKey(r))
                          ),
                          `${interaction.selected.size} rows removed`
                        )
                    : null
                }
                onClearRows={
                  interactive?.onDelete
                    ? () =>
                        deleteRows(orderedKeys, sortedRows, "All rows removed")
                    : null
                }
                hasRows={sortedRows.length > 0}
              />
            )}
          </div>
          {status === "stale" && staleNote && (
            <StaleIndicator lastUpdatedAt={lastUpdatedAt} tone="stale" />
          )}
        </div>
      )}
      <Table className={cn(layout === "fixed" && "table-fixed")}>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <HeaderRow
            columns={columns}
            hasExpanderColumn={showExpanderColumn}
            sort={sort}
            onToggleSort={toggleSort}
            gutter={
              editing
                ? {
                    total: sortedRows.length,
                    selectedCount: interaction.selected.size,
                    orderedKeys,
                    onChange: interaction.setAllSelected,
                  }
                : null
            }
          />
        </TableHeader>
        <TableBody className={cn(status === "stale" && "stale-dim")}>
          {status === "loading" ? (
            <SkeletonRows
              columns={columns}
              hasExpanderColumn={showExpanderColumn}
              hasGutterColumn={editing}
              count={skeletonRows}
              rhythm={ROW_RHYTHM[rowSize]}
            />
          ) : status === "error" ? (
            <ErrorRow colSpan={colSpan} onRetry={onRetry} />
          ) : sortedRows.length === 0 ? (
            <EmptyRow
              colSpan={colSpan}
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : (
            sortedRows.map((row) => {
              const rowId = rowKey(row)
              const content = showExpanderColumn
                ? (getExpandedContent?.(row) ?? null)
                : null
              return (
                <DataRow
                  key={rowId}
                  row={row}
                  rowId={rowId}
                  columns={columns}
                  colSpan={colSpan}
                  rhythm={ROW_RHYTHM[rowSize]}
                  expander={
                    showExpanderColumn
                      ? {
                          content,
                          isExpanded:
                            content !== null && expanded.isExpanded(rowId),
                          onToggle: () => expanded.toggle(rowId),
                          label: expandLabel?.(row) ?? "details",
                        }
                      : null
                  }
                  interaction={
                    editing
                      ? buildRowInteraction({
                          row,
                          rowId,
                          interactive: interactive!,
                          interaction,
                          editFaces,
                          orderedKeys,
                        })
                      : null
                  }
                  cellContext={
                    interaction.enabled
                      ? {
                          mode: editing,
                          slot: activeSlot,
                          rowLabel: interactive?.rowLabel?.(row) ?? rowId,
                          events: cellEvents,
                        }
                      : null
                  }
                />
              )
            })
          )}
        </TableBody>
      </Table>
      <InteractionAnnouncer message={interaction.announcement} />
    </div>
  )
}

/* ---- row interaction assembly ---------------------------------------------
 * Per-row bundle in the `expander` style: one nullable object carrying
 * everything DataRow's interactive face needs, assembled where the state
 * lives. DataRow itself stays a renderer.
 * ------------------------------------------------------------------------ */

interface RowInteraction<Row> {
  label: string
  isSelected: boolean
  onToggleSelect: (range: boolean) => void
  onExtendSelect: (direction: 1 | -1) => void
  onKeySelect: () => void
  /** Non-null when a cell of THIS row is the active inline edit. */
  activeEdit: { columnKey: string; draft: unknown } | null
  beginEdit: (columnKey: string) => void
  onDraftChange: (draft: unknown) => void
  /**
   * Takes the draft VALUE rather than reading state: a picker fires
   * onChange + onCommit in one tick, so the state draft is one render
   * behind at commit time — the cell hands over what it actually holds.
   */
  commitEdit: (finalDraft: unknown) => void
  cancelEdit: () => void
  editFaces: Map<string, EditFace<Row>>
}

function buildRowInteraction<Row>({
  row,
  rowId,
  interactive,
  interaction,
  editFaces,
  orderedKeys,
}: {
  row: Row
  rowId: string
  interactive: DataTableInteractive<Row>
  interaction: TableInteraction<Row>
  editFaces: Map<string, EditFace<Row>>
  orderedKeys: string[]
}): RowInteraction<Row> {
  const label = interactive.rowLabel?.(row) ?? rowId
  const activeEdit =
    interaction.activeEdit?.rowKey === rowId ? interaction.activeEdit : null

  function commitEdit(finalDraft: unknown) {
    const edit = interaction.activeEdit
    if (!edit || edit.rowKey !== rowId) return
    const face = editFaces.get(edit.columnKey)
    interaction.setActiveEdit(null)
    if (!face) return
    const fromDraft = face.type.fromDraft ?? ((d: unknown) => d)
    const value = fromDraft(finalDraft)
    // An uncommittable draft (null) reverts to truth; an unchanged value
    // commits nothing — a patch is a real intent, not an echo.
    if (value === null || value === face.read(row)) return
    interactive.onPatch(rowId, { [face.field]: value }, row)
  }

  return {
    label,
    isSelected: interaction.selected.has(rowId),
    onToggleSelect: (range) =>
      interaction.toggleSelect(rowId, orderedKeys, range),
    onExtendSelect: (direction) => {
      const next = orderedKeys[orderedKeys.indexOf(rowId) + direction]
      if (next) interaction.toggleSelect(next, orderedKeys, true)
    },
    onKeySelect: () => interaction.toggleSelect(rowId, orderedKeys, false),
    activeEdit,
    beginEdit: (columnKey) => {
      const face = editFaces.get(columnKey)
      if (!face) return
      const toDraft = face.type.toDraft ?? ((v: unknown) => v)
      interaction.setActiveEdit({
        rowKey: rowId,
        columnKey,
        draft: toDraft(face.read(row)),
      })
    },
    onDraftChange: (draft) =>
      interaction.setActiveEdit(
        interaction.activeEdit && { ...interaction.activeEdit, draft }
      ),
    commitEdit,
    cancelEdit: () => interaction.setActiveEdit(null),
    editFaces,
  }
}

/* ---- state ---------------------------------------------------------------
 * The hooks know nothing about rendering; the pieces below know nothing
 * about state management. The orchestrator is the only meeting point.
 * ------------------------------------------------------------------------ */

function useTableSort<Row>(
  columns: AnyColumn<Row>[],
  rows: Row[],
  defaultSort?: SortState
) {
  // defaultSort is captured at mount (useState initializer semantics) — a
  // consumer changing it later re-sorts nothing, same as before extraction.
  const [sort, setSort] = React.useState<SortState | null>(defaultSort ?? null)

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    const value = column && sortAccessor(column)
    if (!value) return rows
    const factor = sort.direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) => factor * compareValues(value(a), value(b)))
  }, [rows, columns, sort])

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    )
  }

  return { sortedRows, sort, toggleSort }
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b))
}

function useExpandedKeys() {
  // Keys are never pruned when rows change: an open row staying open across
  // a poll tick (or a loading flash) is the behavior contract, not a leak.
  const [keys, setKeys] = React.useState<Set<string>>(() => new Set())

  return {
    isExpanded: (key: string) => keys.has(key),
    toggle: (key: string) =>
      setKeys((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      }),
  }
}

/* ---- private pieces (in render order) ------------------------------------
 * Function declarations, not arrows: they hoist (so the orchestrator can
 * read first) and sidestep the generic-arrow-in-TSX pitfall. None take
 * React.memo — it erases the Row generic, and rows re-render with the
 * parent by design.
 * ------------------------------------------------------------------------ */

interface HeaderRowProps<Row> {
  columns: AnyColumn<Row>[]
  hasExpanderColumn: boolean
  sort: SortState | null
  onToggleSort: (key: string) => void
  /** Present iff edit mode is on — the select-all face of the interactive gutter. */
  gutter: {
    total: number
    selectedCount: number
    orderedKeys: string[]
    onChange: (keys: string[] | null) => void
  } | null
}

function HeaderRow<Row>({
  columns,
  hasExpanderColumn,
  sort,
  onToggleSort,
  gutter,
}: HeaderRowProps<Row>) {
  return (
    <TableRow className="hover:bg-transparent">
      {gutter && (
        <TableHead className={INTERACTIVE_COL}>
          <SelectAllCheckbox
            total={gutter.total}
            selectedCount={gutter.selectedCount}
            orderedKeys={gutter.orderedKeys}
            onChange={gutter.onChange}
          />
        </TableHead>
      )}
      {hasExpanderColumn && (
        <TableHead className={EXPANDER_COL}>
          <span className="sr-only">Expand row</span>
        </TableHead>
      )}
      {columns.map((column) => {
        const direction = sort?.key === column.key ? sort.direction : null
        return (
          <TableHead
            key={column.key}
            aria-sort={direction ? ARIA_SORT[direction] : undefined}
            // Headers are ALWAYS left-aligned; column.align is data
            // alignment only. The dashboard tables pass no align at
            // all — every column's content shares its header's left
            // edge, so a header always sits over its own data.
            className={cn("text-label text-muted-foreground", column.className)}
          >
            {sortAccessor(column) ? (
              <SortHeaderButton
                direction={direction}
                onToggle={() => onToggleSort(column.key)}
              >
                {column.header}
              </SortHeaderButton>
            ) : (
              column.header
            )}
          </TableHead>
        )
      })}
    </TableRow>
  )
}

interface SortHeaderButtonProps {
  /** One 3-state value, not an `active` boolean beside a direction: null = sortable but not the active sort. */
  direction: "asc" | "desc" | null
  onToggle: () => void
  children: React.ReactNode
}

function SortHeaderButton({
  direction,
  onToggle,
  children,
}: SortHeaderButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 focus-ring hover:text-foreground",
        direction !== null && "text-foreground"
      )}
    >
      {children}
      {direction === "asc" && <ArrowUp aria-hidden className="size-3" />}
      {direction === "desc" && <ArrowDown aria-hidden className="size-3" />}
    </button>
  )
}

interface SkeletonRowsProps<Row> {
  columns: AnyColumn<Row>[]
  hasExpanderColumn: boolean
  /** Mirrors the interactive gutter so a loading tick inside edit mode cannot shear the columns. */
  hasGutterColumn: boolean
  count: number
  /** The table's ROW_RHYTHM step — identical on data rows, so no shift on resolve. */
  rhythm: string
}

function SkeletonRows<Row>({
  columns,
  hasExpanderColumn,
  hasGutterColumn,
  count,
  rhythm,
}: SkeletonRowsProps<Row>) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        // The shared rhythm makes skeleton rows and resolved rows the same
        // height by construction — no line-box forensics.
        <TableRow key={i} className={rhythm}>
          {hasGutterColumn && <TableCell className={INTERACTIVE_COL} />}
          {hasExpanderColumn && <TableCell className={EXPANDER_COL} />}
          {columns.map((column) => (
            <TableCell key={column.key} className={column.className}>
              <Skeleton className="h-4 w-full max-w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

interface ErrorRowProps {
  colSpan: number
  onRetry?: () => void
}

function ErrorRow({ colSpan, onRetry }: ErrorRowProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan}>
        <ErrorState
          title="Couldn't load this table"
          onRetry={onRetry}
          className="border-0"
        />
      </TableCell>
    </TableRow>
  )
}

interface EmptyRowProps {
  colSpan: number
  title: string
  description?: string
}

function EmptyRow({ colSpan, title, description }: EmptyRowProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan}>
        <EmptyState
          title={title}
          description={description}
          className="border-0"
        />
      </TableCell>
    </TableRow>
  )
}

interface DataRowProps<Row> {
  row: Row
  /** rowKey(row) — the React key at the call site and the aria id root here. */
  rowId: string
  columns: AnyColumn<Row>[]
  colSpan: number
  /** The table's ROW_RHYTHM step — identical on skeleton rows, so no shift on resolve. */
  rhythm: string
  /**
   * Present iff the TABLE has an expander column — the lead cell must render
   * even when this row has nothing to expand; content === null omits the
   * toggle. Two-level optionality as one nullable object, not a boolean pair.
   */
  expander: {
    content: React.ReactNode
    isExpanded: boolean
    onToggle: () => void
    label: string
  } | null
  /** Present iff edit mode is on — the row's interactive face, assembled by the orchestrator. */
  interaction: RowInteraction<Row> | null
  /**
   * Everything a cell's content builder needs that isn't the (row, column) it
   * is minted for. Null when the table has no interactive face at all — the
   * builder still mints (a column's `cell` always gets its second argument),
   * but with no mode and no slot every content it builds simply reads.
   */
  cellContext: {
    mode: boolean
    slot: EditSlot | null
    rowLabel: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous across columns by nature
    events: CellValueEvents<any, any>
  } | null
}

function DataRow<Row>({
  row,
  rowId,
  columns,
  colSpan,
  rhythm,
  expander,
  interaction,
  cellContext,
}: DataRowProps<Row>) {
  /**
   * The builder for one cell, closed over its row and column. Minted per cell
   * because that is exactly what it knows — which is what lets a call site
   * write `content.duration({ edits: "sla_target_sec" })` and nothing else.
   */
  function contentFor(column: AnyColumn<Row>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- erased inside; the call site's keys were checked at the door
    return cellContentBuilder<Row, any>({
      row,
      rowKey: rowId,
      columnKey: column.key,
      mode: cellContext?.mode ?? false,
      slot: cellContext?.slot ?? null,
      columnLabel:
        typeof column.header === "string" ? column.header : column.key,
      rowLabel: cellContext?.rowLabel ?? rowId,
      events: cellContext?.events ?? INERT_CELL_EVENTS,
    })
  }

  return (
    <>
      <TableRow
        className={rhythm}
        data-state={interaction?.isSelected ? "selected" : undefined}
        aria-selected={interaction ? interaction.isSelected : undefined}
        onKeyDownCapture={
          interaction
            ? (event) => {
                // `x` toggles selection from anywhere in the row — the
                // Linear grammar — except while a control owns the keys.
                // Capture phase: Base UI controls (the gutter checkbox)
                // stop keydown propagation, and `x` must win regardless.
                if (
                  event.key === "x" &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.altKey &&
                  !isTypingTarget(event.target)
                ) {
                  event.preventDefault()
                  interaction.onKeySelect()
                }
              }
            : undefined
        }
      >
        {interaction && (
          <TableCell className={cn(INTERACTIVE_COL, "py-1")}>
            <RowGutterCell
              label={interaction.label}
              isSelected={interaction.isSelected}
              onToggleSelect={interaction.onToggleSelect}
              onExtendSelect={interaction.onExtendSelect}
            />
          </TableCell>
        )}
        {expander && (
          <TableCell className={cn(EXPANDER_COL, "py-1")}>
            {expander.content !== null && (
              <ExpandToggle
                rowId={rowId}
                isExpanded={expander.isExpanded}
                label={expander.label}
                onToggle={expander.onToggle}
              />
            )}
          </TableCell>
        )}
        {columns.map((column) => {
          const face = interaction?.editFaces.get(column.key)
          return (
            <TableCell
              key={column.key}
              className={cn(
                "text-metric",
                (column.align ?? column.type?.align) === "right" &&
                  "text-right",
                // A block edit anatomy (editCell) is the tallest thing a cell
                // ever holds — at the stock p-2 it exactly MEETS the row
                // rhythm, so sub-pixel rounding tips every row a hair taller
                // and edit mode drifts the page below the table down. Tighter
                // vertical padding buys it clearance; cells are align-middle,
                // so the content stays put.
                interaction && face?.editCell && "py-1",
                column.className
              )}
            >
              {interaction && face ? (
                <EditableCell
                  // A compound cell supplies its own resting edit display
                  // (editCell); everything else shows its normal cell content.
                  display={
                    face.editCell
                      ? face.editCell(row)
                      : cellContent(column, row, contentFor(column))
                  }
                  label={`Edit ${
                    typeof column.header === "string"
                      ? column.header
                      : column.key
                  } — ${interaction.label}`}
                  isActive={interaction.activeEdit?.columnKey === column.key}
                  draft={
                    interaction.activeEdit?.columnKey === column.key
                      ? interaction.activeEdit.draft
                      : undefined
                  }
                  face={face}
                  frameEditor={(editor) =>
                    face.renderField
                      ? face.renderField({ row, editor })
                      : editor
                  }
                  onBegin={() => interaction.beginEdit(column.key)}
                  onDraftChange={interaction.onDraftChange}
                  onCommit={interaction.commitEdit}
                  onCancel={interaction.cancelEdit}
                />
              ) : (
                cellContent(column, row, contentFor(column))
              )}
            </TableCell>
          )
        })}
      </TableRow>
      {expander?.isExpanded && (
        <ExpandedDetailRow rowId={rowId} colSpan={colSpan}>
          {expander.content}
        </ExpandedDetailRow>
      )}
    </>
  )
}

interface ExpandToggleProps {
  rowId: string
  isExpanded: boolean
  label: string
  onToggle: () => void
}

function ExpandToggle({
  rowId,
  isExpanded,
  label,
  onToggle,
}: ExpandToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={`${rowId}-detail`}
      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${label}`}
      // data-state speaks the shadcn disclosure grammar (open/closed) — the
      // DOM stays native table markup because a Collapsible can't wrap <tr>
      // siblings without breaking table semantics, so we match the grammar
      // (aria-expanded/aria-controls + data-state), not the wrapper.
      data-state={isExpanded ? "open" : "closed"}
      className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground focus-ring hover:text-foreground"
    >
      {isExpanded ? (
        <ChevronDown aria-hidden className="size-4" />
      ) : (
        <ChevronRight aria-hidden className="size-4" />
      )}
    </button>
  )
}

interface ExpandedDetailRowProps {
  rowId: string
  colSpan: number
  children: React.ReactNode
}

function ExpandedDetailRow({
  rowId,
  colSpan,
  children,
}: ExpandedDetailRowProps) {
  return (
    <TableRow data-state="open" className="bg-muted/40 hover:bg-muted/40">
      <TableCell id={`${rowId}-detail`} colSpan={colSpan} className="px-4 py-3">
        {children}
      </TableCell>
    </TableRow>
  )
}

export { DataTable }
