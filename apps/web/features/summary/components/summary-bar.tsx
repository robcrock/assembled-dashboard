"use client"

// The thin status strip — "is the floor okay?" — glanced every few minutes.
// Four vitals as StatCards: SLA attainment (with trend + delta), queues
// breaching (with canonical status dot), tickets waiting, out of adherence.
//
// Deltas are vs. the PREVIOUS TICK, and the attainment trend is accumulated
// here from the frames this component receives — the hook hands out one frame
// at a time, and no other consumer needs summary history, so the slice owns
// its own small ring buffer rather than widening the store's API.

import { useEffect, useState } from "react"

import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { Sparkline } from "@workspace/ui/components/sparkline"
import { StatCard } from "@workspace/ui/components/stat-card"
import { StatusDot } from "@workspace/ui/components/status-badge"
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

export function SummaryBar({ summary, ts, feed }: SummaryBarProps) {
  const [entries, setEntries] = useState<SummaryEntry[]>([])

  useEffect(() => {
    if (!summary || !ts) return
    setEntries((prev) =>
      prev[prev.length - 1]?.ts === ts
        ? prev
        : [
            ...prev.slice(-19),
            {
              ts,
              attainment: summary.sla_attainment_pct,
              waiting: summary.tickets_waiting_total,
              outOfAdherence: summary.agents_out_of_adherence,
            },
          ],
    )
  }, [summary, ts])

  // Last entry from a different tick = the previous tick's vitals.
  const previous = [...entries].reverse().find((e) => e.ts !== ts)
  const attainmentTrend = entries.map((e) => e.attainment)

  return (
    <section
      aria-label="Floor summary"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <StatCard
        feed={feed}
        label="SLA attainment"
        value={summary ? `${summary.sla_attainment_pct}%` : undefined}
        delta={
          summary && previous ? (
            <MetricDelta
              value={summary.sla_attainment_pct - previous.attainment}
              unit="pp"
            />
          ) : undefined
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
        feed={feed}
        label="Queues breaching"
        value={summary?.queues_breaching}
        delta={
          summary ? (
            <StatusDot
              status={summary.queues_breaching > 0 ? "breached" : "healthy"}
              decorative
            />
          ) : undefined
        }
      >
        {summary && (
          <span className="text-muted-foreground text-metric-sm">
            {summary.queues_at_risk} at risk · {summary.queues_total} queues
          </span>
        )}
      </StatCard>

      <StatCard
        feed={feed}
        label="Tickets waiting"
        value={summary?.tickets_waiting_total}
        delta={
          summary && previous ? (
            <MetricDelta
              value={summary.tickets_waiting_total - previous.waiting}
              unit=""
              invert
            />
          ) : undefined
        }
      />

      <StatCard
        feed={feed}
        label="Out of adherence"
        value={summary?.agents_out_of_adherence}
        delta={
          summary && previous ? (
            <MetricDelta
              value={summary.agents_out_of_adherence - previous.outOfAdherence}
              unit=""
              invert
            />
          ) : undefined
        }
      >
        {summary && (
          <span className="text-muted-foreground text-metric-sm">
            of {summary.agents_online} online
          </span>
        )}
      </StatCard>
    </section>
  )
}
