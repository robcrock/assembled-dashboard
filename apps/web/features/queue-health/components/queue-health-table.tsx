"use client"

// The heart of the page: queues sorted by trouble. Composes DataTable +
// StatusBadge + DeviationBar + SparkBars + MetricDelta + Duration over Queue[].
//
// Judgment calls this slice owns:
// - Never rank raw wait seconds — headroom sorts by pressure against each
//   queue's OWN target (Onboarding's 370s is healthy vs a 30-min promise;
//   VIP's 250s is scary vs 5).
// - Headroom renders as a DIVERGING bar around the target: over-target crosses
//   right past the baseline dot, headroom extends left. The whole cell is
//   colorless — bar and percent both neutral; the SLA verdict rides entirely
//   in the Status badge, so nothing else on the row competes with it.
// - Volume reuses the same deviation anatomy (actual / forecast over a bar
//   whose baseline dot is the forecast) fully colorless: over-forecast is
//   the leading indicator of the next breach, not a verdict — direction reads
//   from the bar crossing the dot, and red stays reserved for actual breach.
// - Healthy tail is DIMMED, not collapsed: six queues fit on one screen, and
//   collapsing hides what a manager still scans; dimming keeps the fire loud
//   and the calm visible-but-quiet.
// - Breached rows say HOW FAR past the promise, in the status badge itself.
// - Wait trend renders as bars judged against the queue's OWN SLA target:
//   over-target samples light up, the rest stay neutral. That makes "how
//   often did we cross the promise" legible without a directional arrow —
//   and it's a rendered annotation only, never a sort key; the triage order
//   is severity + headroom.
// - Each row expands to its "who can help" coverage roster (recover the
//   out-of-adherence agent first, then shift a cross-trained one), derived
//   from the SAME agent pool the adherence table reads.

import { useMemo, type ReactNode } from "react"

import { Duration } from "@workspace/ui/components/duration"
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { DeviationBar } from "@workspace/ui/components/deviation-bar"
import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { SparkBars } from "@workspace/ui/components/spark-bars"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { Feed } from "@workspace/ui/lib/feed"
import { formatDurationSec } from "@workspace/ui/lib/duration"

import { QueueCoveragePanel } from "@/features/queue-health/components/queue-coverage"
import {
  deriveQueueCoverage,
  type CoverageAgent,
  type QueueCoverage,
} from "@/features/queue-health/model/coverage"
import {
  compareQueuesBySeverity,
  queueSeverityRank,
  type Queue,
} from "@/features/queue-health/model/queue"

/**
 * Shared WHOOP-style cell anatomy for "value vs. its own target" columns:
 * context line (absolutes left, signed percent right) over a full-width
 * diverging bar. Table-layout composition, not a primitive — it earns
 * promotion to @workspace/ui only with a second consumer file.
 */
function DeviationCell({
  absolutes,
  delta,
  bar,
}: {
  absolutes: ReactNode
  delta: ReactNode
  bar: ReactNode
}) {
  return (
    <div className="ml-auto flex w-36 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-metric-sm">
          {absolutes}
        </span>
        {delta}
      </div>
      {bar}
    </div>
  )
}

interface QueueHealthTableProps {
  queues: Queue[]
  /** The shared agent pool — powers the per-queue "who can help" detail. */
  agents?: CoverageAgent[]
  feed?: Feed
}

export function QueueHealthTable({
  queues,
  agents = [],
  feed,
}: QueueHealthTableProps) {
  const rows = useMemo(
    () => [...queues].sort(compareQueuesBySeverity),
    [queues],
  )

  const coverageByQueue = useMemo(() => {
    const map = new Map<string, QueueCoverage>()
    for (const queue of queues) {
      map.set(queue.queue_id, deriveQueueCoverage(queue, queues, agents))
    }
    return map
  }, [queues, agents])

  const columns = useMemo<DataTableColumn<Queue>[]>(
    () => [
      // Queue name leads: it's a queue table, so the entity being ranked is
      // the first thing the eye lands on; the status verdict reads second.
      {
        key: "queue",
        header: "Queue",
        // inherits row color so rowTone's de-emphasis reaches the name
        cell: (q) => <span className="font-medium">{q.name}</span>,
        sortValue: (q) => q.name,
      },
      {
        key: "status",
        header: "Status",
        cell: (q) => {
          const overSec = q.longest_wait_sec - q.sla_target_sec
          return (
            <StatusBadge status={q.sla_status}>
              {/* full-alpha ink: dimming tinted text stacks opacity on color —
                  the exact contrast hazard the muted-row comment warns about;
                  the middot already de-emphasizes */}
              {q.sla_status === "breached" && overSec > 0 && (
                <span>· {formatDurationSec(overSec)} over</span>
              )}
            </StatusBadge>
          )
        },
        // The model's single triage key — shared with the pre-sort comparator
        // so the two orderings can't drift.
        sortValue: (q) => queueSeverityRank(q),
      },
      {
        key: "headroom",
        header: "Headroom",
        // WHOOP-style: context line (absolutes left, percent right) over a
        // diverging bar whose baseline dot is the target itself. The whole
        // cell is neutral — the status verdict rides in the Status badge, so
        // the percent stays a plain colorless annotation like every delta.
        cell: (q) => (
          <DeviationCell
            absolutes={
              <>
                <Duration seconds={q.longest_wait_sec} /> /{" "}
                <Duration seconds={q.sla_target_sec} />
              </>
            }
            delta={<MetricDelta value={q.sla_headroom_pct} />}
            bar={
              <DeviationBar
                value={q.sla_headroom_pct}
                label={`${q.name}: longest wait ${formatDurationSec(q.longest_wait_sec)} against a ${formatDurationSec(q.sla_target_sec)} target`}
                className="w-full"
              />
            }
          />
        ),
        // Pressure vs. the queue's own target — never raw seconds.
        sortValue: (q) => q.sla_headroom_pct,
        align: "right",
      },
      {
        key: "waiting",
        header: "Waiting",
        cell: (q) => q.tickets_waiting,
        sortValue: (q) => q.tickets_waiting,
        align: "right",
      },
      {
        key: "coverage",
        header: "Coverage",
        cell: (q) => {
          const recoverable =
            coverageByQueue.get(q.queue_id)?.recoverable.length ?? 0
          return (
            <div className="flex flex-col items-end">
              <span>
                {q.agents_on_call}
                <span className="text-muted-foreground"> on call</span>
              </span>
              {/* recoverability is GOOD news (capacity you can get back), so
                  it reads in the calm muted ink, not a warning tint */}
              {recoverable > 0 && (
                <span className="text-muted-foreground text-metric-sm">
                  {recoverable} recoverable
                </span>
              )}
            </div>
          )
        },
        sortValue: (q) => q.agents_on_call,
        align: "right",
      },
      {
        key: "forecast",
        header: "Volume",
        // Same deviation anatomy as headroom, deliberately COLORLESS: the bar's
        // baseline dot is the forecast, but over-forecast is a leading
        // indicator, not a verdict — no status tint, stock muted delta.
        cell: (q) => (
          <DeviationCell
            absolutes={`${q.volume_last_15m} / ${q.volume_forecast_next_15m}`}
            delta={<MetricDelta value={q.volume_vs_forecast_pct} />}
            bar={
              <DeviationBar
                value={q.volume_vs_forecast_pct}
                range={50}
                label={`${q.name}: ${q.volume_last_15m} tickets last 15m against a forecast of ${q.volume_forecast_next_15m}`}
                className="w-full"
              />
            }
          />
        ),
        sortValue: (q) => q.volume_vs_forecast_pct,
        align: "right",
      },
      {
        key: "trend",
        header: "Wait trend",
        cell: (q) => (
          <SparkBars
            points={q.wait_trend_sec}
            threshold={q.sla_target_sec}
            label={`Longest wait trend for ${q.name}: ${q.wait_trend_sec.filter((s) => s > q.sla_target_sec).length} of ${q.wait_trend_sec.length} samples over the ${formatDurationSec(q.sla_target_sec)} target`}
          />
        ),
        align: "right",
      },
    ],
    [coverageByQueue],
  )

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(q) => q.queue_id}
      caption="Queues ordered by SLA severity: breaching first, then at risk, then healthy. Shows SLA headroom against each queue's own target, backlog, coverage, volume versus forecast, and the wait trend. Expand a row to see which agents can help that queue."
      feed={feed}
      emptyTitle="No queues reporting"
      emptyDescription="Queues appear as soon as the feed reports them."
      rowTone={(q) => (q.sla_status === "healthy" ? "muted" : "default")}
      getExpandedContent={(q) => {
        const coverage = coverageByQueue.get(q.queue_id)
        return coverage ? (
          <QueueCoveragePanel queueName={q.name} coverage={coverage} />
        ) : null
      }}
      expandLabel={(q) => `${q.name} coverage`}
      defaultSort={{ key: "status", direction: "asc" }}
      skeletonRows={6}
    />
  )
}
