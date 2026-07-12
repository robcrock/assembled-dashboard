"use client"

// The org-level overview: one hero number — SLA attainment — as an arc gauge.
// This replaced a row of mixed KPIs with the single number that answers "is
// the floor keeping its promise?"; the section-level alarm counts (queues
// breaching, agents out of adherence) render beside it, fed by the
// composition root.
//
// Owns a render-time ring buffer of recent ticks (same idempotent last-ts
// pattern the old summary strip used) so the delta is tick-over-tick without
// widening the store's API.

import { useRef } from "react"

import { ErrorState } from "@workspace/ui/components/error-state"
import { Gauge } from "@workspace/ui/components/gauge"
import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { StaleIndicator } from "@workspace/ui/components/stale-indicator"
import type { Feed } from "@workspace/ui/lib/feed"
import { cn } from "@workspace/ui/lib/utils"

import type { Summary } from "@/features/summary/model/summary"

interface AttainmentEntry {
  ts: string
  attainment: number
}

interface AttainmentOverviewProps {
  summary: Summary | null
  /** Frame timestamp — keys the tick-over-tick accumulation. */
  ts: string | null
  feed?: Feed
  className?: string
}

export function AttainmentOverview({
  summary,
  ts,
  feed = { status: "live" },
  className,
}: AttainmentOverviewProps) {
  const { status, lastUpdatedAt = null, onRetry } = feed

  // History accumulates in a ref during render, appended only when a new tick
  // (`ts`) arrives — idempotent under repeat renders / StrictMode.
  const entriesRef = useRef<AttainmentEntry[]>([])
  if (
    summary &&
    ts &&
    entriesRef.current[entriesRef.current.length - 1]?.ts !== ts
  ) {
    entriesRef.current = [
      ...entriesRef.current.slice(-19),
      { ts, attainment: summary.sla_attainment_pct },
    ]
  }
  const previous = [...entriesRef.current].reverse().find((e) => e.ts !== ts)

  if (status === "loading") {
    return <Skeleton className={cn("size-44 shrink-0 rounded-full", className)} />
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Overview unavailable"
        onRetry={onRetry}
        className={className}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center gap-1",
        status === "stale" && "stale-dim",
        className,
      )}
    >
      <Gauge
        value={summary?.sla_attainment_pct ?? 0}
        label={`SLA attainment ${summary ? `${summary.sla_attainment_pct}%` : "unavailable"}`}
      >
        <div className="text-metric-xl">
          {summary ? (
            `${summary.sla_attainment_pct}%`
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        {summary &&
          previous &&
          summary.sla_attainment_pct !== previous.attainment && (
            <MetricDelta
              value={summary.sla_attainment_pct - previous.attainment}
              unit="pp"
            />
          )}
        <div className="text-muted-foreground text-xs font-medium">
          SLA attainment
        </div>
      </Gauge>
      {status === "stale" && (
        <StaleIndicator lastUpdatedAt={lastUpdatedAt} tone="stale" />
      )}
    </div>
  )
}
