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
// StaleIndicator but never blanks; error offers retry.

// One fixed rhythm for every body row — skeleton and resolved alike — so
// loading -> live cannot shift (the states contract) and row height stops
// depending on WHICH cell content sets the line-box (a badge's svg-first
// flex baseline inflates it unpredictably vs a text-only row). 40px sits on
// the Braun 8px grid; td height acts as min-height, so a consumer's taller
// custom cells still grow past it.
const ROW_RHYTHM = "h-10"

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
   * Per-row de-emphasis without the table knowing why — severity-sorted
   * consumers mute their healthy tail ("muted"), the table just renders it.
   */
  rowTone?: (row: Row) => "default" | "muted"
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
  defaultSort?: { key: string; direction: "asc" | "desc" }
  skeletonRows?: number
  className?: string
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b))
}

function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  feed = { status: "live" },
  emptyTitle = "Nothing to show",
  emptyDescription,
  rowTone,
  getExpandedContent,
  expandLabel,
  defaultSort,
  skeletonRows = 5,
  className,
}: DataTableProps<Row>) {
  const { status, lastUpdatedAt = null, onRetry } = feed
  const [sort, setSort] = React.useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(defaultSort ?? null)
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(
    () => new Set(),
  )

  const expandable = Boolean(getExpandedContent)
  const colSpan = columns.length + (expandable ? 1 : 0)

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

  return (
    <div className={className}>
      {status === "stale" && (
        <div className="mb-1 flex justify-end">
          <StaleIndicator lastUpdatedAt={lastUpdatedAt} tone="stale" />
        </div>
      )}
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {expandable && (
              <TableHead className="w-8">
                <span className="sr-only">Expand row</span>
              </TableHead>
            )}
            {columns.map((column) => {
              const sortable = Boolean(column.sortValue)
              const active = sort?.key === column.key
              return (
                <TableHead
                  key={column.key}
                  aria-sort={
                    active
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  // Headers are ALWAYS left-aligned; column.align is data
                  // alignment only. The dashboard tables pass no align at
                  // all — every column's content shares its header's left
                  // edge, so a header always sits over its own data.
                  className={cn(
                    "text-muted-foreground text-label",
                    column.className,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "focus-ring -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 hover:text-foreground",
                        active && "text-foreground",
                      )}
                    >
                      {column.header}
                      {active &&
                        (sort.direction === "asc" ? (
                          <ArrowUp aria-hidden className="size-3" />
                        ) : (
                          <ArrowDown aria-hidden className="size-3" />
                        ))}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody className={cn(status === "stale" && "stale-dim")}>
          {status === "loading" ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              // ROW_RHYTHM makes skeleton rows and resolved rows the same
              // height by construction — no line-box forensics.
              <TableRow key={i} className={ROW_RHYTHM}>
                {expandable && <TableCell className="w-8" />}
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    <Skeleton className="h-4 w-full max-w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : status === "error" ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan}>
                <ErrorState
                  title="Couldn't load this table"
                  onRetry={onRetry}
                  className="border-0"
                />
              </TableCell>
            </TableRow>
          ) : sortedRows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  className="border-0"
                />
              </TableCell>
            </TableRow>
          ) : (
            sortedRows.map((row) => {
              const tone = rowTone?.(row) ?? "default"
              const key = rowKey(row)
              const expandedContent = getExpandedContent?.(row) ?? null
              const isExpanded = expandedContent !== null && expandedKeys.has(key)
              return (
                <React.Fragment key={key}>
                  <TableRow
                    // de-emphasis is color-only: muted-foreground keeps AA
                    // contrast; stacking opacity on top would crush it (~2.2:1)
                    className={cn(
                      ROW_RHYTHM,
                      tone === "muted" && "text-muted-foreground",
                    )}
                  >
                    {expandable && (
                      <TableCell className="w-8 py-1">
                        {expandedContent !== null && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(key)}
                            aria-expanded={isExpanded}
                            aria-controls={`${key}-detail`}
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${
                              expandLabel?.(row) ?? "details"
                            }`}
                            className="focus-ring hover:text-foreground text-muted-foreground inline-flex size-6 items-center justify-center rounded-sm"
                          >
                            {isExpanded ? (
                              <ChevronDown aria-hidden className="size-4" />
                            ) : (
                              <ChevronRight aria-hidden className="size-4" />
                            )}
                          </button>
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
                  {isExpanded && (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell
                        id={`${key}-detail`}
                        colSpan={colSpan}
                        className="px-4 py-3"
                      >
                        {expandedContent}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export { DataTable }
