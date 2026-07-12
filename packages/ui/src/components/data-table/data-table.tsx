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
// slots to save this one string).
const EXPANDER_COL = "w-8"

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const

export interface DataTableColumn<Row> {
  /** Stable id; also the sort key. */
  key: string
  header: React.ReactNode
  cell: (row: Row) => React.ReactNode
  /** Presence makes the column sortable. */
  sortValue?: (row: Row) => number | string
  align?: "left" | "right"
  /** Applied to both the header cell and body cells (widths, emphasis). */
  className?: string
}

interface SortState {
  key: string
  direction: "asc" | "desc"
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
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
   * Render the "Stale · updated Xs ago" note above the table when the feed
   * degrades (default true — the table stays self-contained). Pass false on
   * pages whose chrome already mounts the ONE canonical `StaleIndicator`: the
   * body dim still applies — honesty is not optional, repetition is.
   */
  staleNote?: boolean
  className?: string
}

function DataTable<Row>({
  columns,
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
  staleNote = true,
  className,
}: DataTableProps<Row>) {
  const { status, lastUpdatedAt = null, onRetry } = feed
  const { sortedRows, sort, toggleSort } = useTableSort(columns, rows, defaultSort)
  const expanded = useExpandedKeys()

  // Column presence is table-level (the callback exists), independent of any
  // row's result — a table whose every row returns null still gets the column.
  const hasExpanderColumn = Boolean(getExpandedContent)
  const colSpan = columns.length + (hasExpanderColumn ? 1 : 0)

  return (
    <div className={className}>
      {status === "stale" && staleNote && (
        <div className="mb-1 flex justify-end">
          <StaleIndicator lastUpdatedAt={lastUpdatedAt} tone="stale" />
        </div>
      )}
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <HeaderRow
            columns={columns}
            hasExpanderColumn={hasExpanderColumn}
            sort={sort}
            onToggleSort={toggleSort}
          />
        </TableHeader>
        <TableBody className={cn(status === "stale" && "stale-dim")}>
          {status === "loading" ? (
            <SkeletonRows
              columns={columns}
              hasExpanderColumn={hasExpanderColumn}
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
              const content = getExpandedContent?.(row) ?? null
              return (
                <DataRow
                  key={rowId}
                  row={row}
                  rowId={rowId}
                  columns={columns}
                  colSpan={colSpan}
                  rhythm={ROW_RHYTHM[rowSize]}
                  expander={
                    hasExpanderColumn
                      ? {
                          content,
                          isExpanded:
                            content !== null && expanded.isExpanded(rowId),
                          onToggle: () => expanded.toggle(rowId),
                          label: expandLabel?.(row) ?? "details",
                        }
                      : null
                  }
                />
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/* ---- state ---------------------------------------------------------------
 * The hooks know nothing about rendering; the pieces below know nothing
 * about state management. The orchestrator is the only meeting point.
 * ------------------------------------------------------------------------ */

function useTableSort<Row>(
  columns: DataTableColumn<Row>[],
  rows: Row[],
  defaultSort?: SortState,
) {
  // defaultSort is captured at mount (useState initializer semantics) — a
  // consumer changing it later re-sorts nothing, same as before extraction.
  const [sort, setSort] = React.useState<SortState | null>(defaultSort ?? null)

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows
    const value = column.sortValue
    const factor = sort.direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) => factor * compareValues(value(a), value(b)))
  }, [rows, columns, sort])

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
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
  columns: DataTableColumn<Row>[]
  hasExpanderColumn: boolean
  sort: SortState | null
  onToggleSort: (key: string) => void
}

function HeaderRow<Row>({
  columns,
  hasExpanderColumn,
  sort,
  onToggleSort,
}: HeaderRowProps<Row>) {
  return (
    <TableRow className="hover:bg-transparent">
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
            className={cn("text-muted-foreground text-label", column.className)}
          >
            {column.sortValue ? (
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
        "focus-ring -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 hover:text-foreground",
        direction !== null && "text-foreground",
      )}
    >
      {children}
      {direction === "asc" && <ArrowUp aria-hidden className="size-3" />}
      {direction === "desc" && <ArrowDown aria-hidden className="size-3" />}
    </button>
  )
}

interface SkeletonRowsProps<Row> {
  columns: DataTableColumn<Row>[]
  hasExpanderColumn: boolean
  count: number
  /** The table's ROW_RHYTHM step — identical on data rows, so no shift on resolve. */
  rhythm: string
}

function SkeletonRows<Row>({
  columns,
  hasExpanderColumn,
  count,
  rhythm,
}: SkeletonRowsProps<Row>) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        // The shared rhythm makes skeleton rows and resolved rows the same
        // height by construction — no line-box forensics.
        <TableRow key={i} className={rhythm}>
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
        <EmptyState title={title} description={description} className="border-0" />
      </TableCell>
    </TableRow>
  )
}

interface DataRowProps<Row> {
  row: Row
  /** rowKey(row) — the React key at the call site and the aria id root here. */
  rowId: string
  columns: DataTableColumn<Row>[]
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
}

function DataRow<Row>({
  row,
  rowId,
  columns,
  colSpan,
  rhythm,
  expander,
}: DataRowProps<Row>) {
  return (
    <>
      <TableRow className={rhythm}>
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
        {columns.map((column) => (
          <TableCell
            key={column.key}
            className={cn(
              "text-metric",
              column.align === "right" && "text-right",
              column.className,
            )}
          >
            {column.cell(row)}
          </TableCell>
        ))}
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

function ExpandToggle({ rowId, isExpanded, label, onToggle }: ExpandToggleProps) {
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
      className="focus-ring hover:text-foreground text-muted-foreground inline-flex size-6 items-center justify-center rounded-sm"
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

function ExpandedDetailRow({ rowId, colSpan, children }: ExpandedDetailRowProps) {
  return (
    <TableRow data-state="open" className="bg-muted/40 hover:bg-muted/40">
      <TableCell id={`${rowId}-detail`} colSpan={colSpan} className="px-4 py-3">
        {children}
      </TableCell>
    </TableRow>
  )
}

export { DataTable }
