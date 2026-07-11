"use client"

// The thin status strip — "is the floor okay?" — glanced every few minutes.
// Four vitals as a divider-separated KPI row (sibling stats in a shared
// context take dividers, not card chrome): SLA attainment (with trend +
// delta), queues breaching, tickets waiting, out of adherence. The breach
// and adherence counts take the reserved breach ink when non-zero — the
// strip's only color, so red here always means a broken promise.
//
// Deltas are vs. the PREVIOUS TICK and are omitted when flat (a "0" delta is
// noise at a glance). The attainment trend is accumulated here from the
// frames this component receives — the hook hands out one frame at a time,
// and no other consumer needs summary history, so the slice owns its own
// small ring buffer rather than widening the store's API.

import { useRef } from "react"

import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { Sparkline } from "@workspace/ui/components/sparkline"
import { StatCard } from "@workspace/ui/components/stat-card"
import type { Feed } from "@workspace/ui/lib/feed"

import type { Summary } from "@/features/summary/model/summary"

interface SummaryEntry {
  ts: string
  attainment: number
  waiting: number
  outOfAdherence: number
}

interface SummaryBarProps {
  summary: Summary | null
  /** Frame timestamp — keys the tick-over-tick accumulation. */
  ts: string | null
  feed?: Feed
}

/** Reserved breach ink when the count is non-zero; calm foreground at zero. */
function alarmValue(count: number | undefined) {
  if (count === undefined) return undefined
  return count > 0 ? <span className="text-sla-breach">{count}</span> : count
}

/** Tick-over-tick delta, omitted when flat — only movement earns ink. */
function tickDelta(current: number, previous: number | undefined, unit = "") {
  if (previous === undefined || current === previous) return undefined
  return <MetricDelta value={current - previous} unit={unit} />
}

export function SummaryBar({ summary, ts, feed }: SummaryBarProps) {
  // History accumulates across renders in a ref, appended during render when a
  // new tick (`ts`) arrives — a pure function of the tick sequence, so no
  // effect and no setState-in-effect cascade. The last-ts guard makes the
  // append idempotent (repeat renders / StrictMode double-invoke never dup).
  const entriesRef = useRef<SummaryEntry[]>([])
  if (summary && ts && entriesRef.current[entriesRef.current.length - 1]?.ts !== ts) {
    entriesRef.current = [
      ...entriesRef.current.slice(-19),
      {
        ts,
        attainment: summary.sla_attainment_pct,
        waiting: summary.tickets_waiting_total,
        outOfAdherence: summary.agents_out_of_adherence,
      },
    ]
  }
  const entries = entriesRef.current

  // Last entry from a different tick = the previous tick's vitals.
  const previous = [...entries].reverse().find((e) => e.ts !== ts)
  const attainmentTrend = entries.map((e) => e.attainment)

  return (
    <section aria-label="Floor summary" className="@container">
      {/* Divider-separated siblings: 2-up stacks with a horizontal rule
          between rows; 4-up swaps it for vertical rules. Padding follows the
          first/last-in-row rules so column edges stay aligned. */}
      <div className="grid grid-cols-2 @3xl:grid-cols-4">
        <StatCard
          variant="plain"
          className="pr-6 pb-5 @3xl:pb-0"
          feed={feed}
          label="SLA attainment"
          value={summary ? `${summary.sla_attainment_pct}%` : undefined}
          delta={
            summary
              ? tickDelta(summary.sla_attainment_pct, previous?.attainment, "pp")
              : undefined
          }
        >
          {attainmentTrend.length >= 2 && (
            <Sparkline
              points={attainmentTrend}
              label={`SLA attainment trend from ${attainmentTrend[0]}% to ${attainmentTrend[attainmentTrend.length - 1]}%`}
            />
          )}
        </StatCard>

        <StatCard
          variant="plain"
          className="border-l pb-5 pl-6 @3xl:pr-6 @3xl:pb-0"
          feed={feed}
          label="Queues breaching"
          value={alarmValue(summary?.queues_breaching)}
        >
          {summary && (
            <div className="text-muted-foreground text-metric-sm">
              {summary.queues_at_risk} at risk · {summary.queues_total} queues
            </div>
          )}
        </StatCard>

        <StatCard
          variant="plain"
          className="border-t pt-5 pr-6 @3xl:border-t-0 @3xl:border-l @3xl:pt-0 @3xl:pl-6"
          feed={feed}
          label="Tickets waiting"
          value={summary?.tickets_waiting_total}
          delta={
            summary
              ? tickDelta(summary.tickets_waiting_total, previous?.waiting)
              : undefined
          }
        />

        <StatCard
          variant="plain"
          className="border-t border-l pt-5 pl-6 @3xl:border-t-0 @3xl:pt-0"
          feed={feed}
          label="Out of adherence"
          value={alarmValue(summary?.agents_out_of_adherence)}
          delta={
            summary
              ? tickDelta(
                  summary.agents_out_of_adherence,
                  previous?.outOfAdherence,
                )
              : undefined
          }
        >
          {summary && (
            <div className="text-muted-foreground text-metric-sm">
              of {summary.agents_online} online
            </div>
          )}
        </StatCard>
      </div>
    </section>
  )
}
