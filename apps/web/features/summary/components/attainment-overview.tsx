"use client"

// The org-level overview: SLA attainment as the first of the band's three
// KPI tiles — the SAME StatCard anatomy as the alarm counts beside it (mono
// label / hero number / muted sub-line), so the rhythm match is structural,
// not imitative. The one thing only this tile carries: the promise as a
// 0–100 Meter line anchored at the bottom. (The arc gauge this replaced
// broke the band's rhythm; the quiet bar keeps the graphical read.) The
// fill is neutral ink — attainment is a reading, not a verdict; orange
// stays on the alarm counts beside it.
//
// Owns a ring buffer of recent ticks (state adjusted during render, guarded
// by the last seen `ts`) so the delta is tick-over-tick without widening the
// store's API. Rendering delegates to StatCard, so all four feed states come
// from the one owner every KPI tile uses — the hand-rolled skeleton/error/
// stale this component used to carry is gone.

import { useState } from "react"

import { Meter } from "@workspace/ui/components/meter"
import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { StatCard } from "@workspace/ui/components/stat-card"
import type { Feed } from "@workspace/ui/lib/feed"

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
  // History accumulates via the adjust-state-during-render pattern: when a
  // new tick (`ts`) arrives, the guarded setState makes React re-run this
  // render with the appended buffer BEFORE committing, so the delta lands in
  // the same paint — and the `lastTs` guard keeps the append idempotent under
  // repeat renders / StrictMode. Not an effect: that would show the delta one
  // paint late.
  const [entries, setEntries] = useState<AttainmentEntry[]>([])
  const [lastTs, setLastTs] = useState<string | null>(null)
  if (summary && ts && ts !== lastTs) {
    setLastTs(ts)
    setEntries((prev) => [
      ...prev.slice(-19),
      { ts, attainment: summary.sla_attainment_pct },
    ])
  }
  const previous = [...entries].reverse().find((e) => e.ts !== ts)

  return (
    <StatCard
      variant="plain"
      size="lg"
      feed={feed}
      // the template's chrome StaleIndicator is the page's ONE stale note
      staleNote={false}
      label="SLA attainment"
      value={summary ? `${summary.sla_attainment_pct}%` : undefined}
      className={className}
    >
      {summary && (
        <div className="flex flex-col gap-2">
          {/* Renders even at 0pp so the tile never changes height between
              ticks; "pp" = percentage points, the WFM idiom. */}
          <MetricDelta
            value={
              previous ? summary.sla_attainment_pct - previous.attainment : 0
            }
            unit="pp"
          />
          <Meter
            value={summary.sla_attainment_pct}
            max={100}
            label={`SLA attainment: ${summary.sla_attainment_pct} of 100 percent`}
            className="w-full"
          />
        </div>
      )}
    </StatCard>
  )
}
