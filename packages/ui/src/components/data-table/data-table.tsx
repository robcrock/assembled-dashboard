"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

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
  defaultSort,
  skeletonRows = 5,
  className,
}: DataTableProps<Row>) {
  const { status, lastUpdatedAt = null, onRetry } = feed
  const [sort, setSort] = React.useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(defaultSort ?? null)

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
                  className={cn(
                    "text-muted-foreground text-xs",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "focus-visible:ring-ring/50 -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 hover:text-foreground focus-visible:ring-[3px] focus-visible:outline-none",
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
        <TableBody className={cn(status === "stale" && "opacity-60")}>
          {status === "loading" ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={i}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    <Skeleton className="h-4 w-full max-w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : status === "error" ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length}>
                <ErrorState
                  title="Couldn't load this table"
                  onRetry={onRetry}
                  className="border-0"
                />
              </TableCell>
            </TableRow>
          ) : sortedRows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length}>
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
              return (
                <TableRow
                  key={rowKey(row)}
                  // de-emphasis is color-only: muted-foreground keeps AA
                  // contrast; stacking opacity on top would crush it (~2.2:1)
                  className={cn(tone === "muted" && "text-muted-foreground")}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "text-metric font-normal",
                        column.align === "right" && "text-right",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export { DataTable }
