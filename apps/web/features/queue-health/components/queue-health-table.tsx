"use client"

// The heart of the page: queues sorted by trouble. Composes DataTable +
// StatusBadge + Sparkline + MetricDelta + Duration over Queue[].
//
// Judgment calls this slice owns:
// - Never rank raw wait seconds — the wait column sorts by pressure against
//   each queue's OWN target (Onboarding's 370s is healthy vs a 30-min promise;
//   VIP's 250s is scary vs 5).
// - Healthy tail is DIMMED, not collapsed: six queues fit on one screen, and
//   collapsing hides what a manager still scans; dimming keeps the fire loud
//   and the calm visible-but-quiet.
// - Breached rows say HOW FAR past the promise, in the status badge itself.

import { Duration } from "@workspace/ui/components/duration"
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { Sparkline } from "@workspace/ui/components/sparkline"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { Feed } from "@workspace/ui/lib/feed"
import { formatDurationSec } from "@workspace/ui/lib/duration"

import {
  compareQueuesBySeverity,
  queueSeverityRank,
  type Queue,
} from "@/features/queue-health/model/queue"

const columns: DataTableColumn<Queue>[] = [
  {
    key: "status",
    header: "Status",
    cell: (q) => {
      const overSec = q.longest_wait_sec - q.sla_target_sec
      return (
        <StatusBadge status={q.sla_status}>
          {q.sla_status === "breached" && overSec > 0 && (
            <span className="opacity-80">
              · {formatDurationSec(overSec)} over
            </span>
          )}
        </StatusBadge>
      )
    },
    // The model's single triage key — shared with the pre-sort comparator so
    // the two orderings can't drift.
    sortValue: (q) => queueSeverityRank(q),
  },
  {
    key: "queue",
    header: "Queue",
    // inherits row color so rowTone's de-emphasis reaches the name
    cell: (q) => <span className="font-medium">{q.name}</span>,
    sortValue: (q) => q.name,
  },
  {
    key: "wait",
    header: "Longest wait",
    cell: (q) => (
      <span>
        <Duration seconds={q.longest_wait_sec} />
        <span className="text-muted-foreground">
          {" "}
          / <Duration seconds={q.sla_target_sec} />
        </span>
      </span>
    ),
    // Pressure vs. the queue's own target — never raw seconds.
    sortValue: (q) => q.longest_wait_sec / q.sla_target_sec,
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
    key: "agents",
    header: "Agents",
    cell: (q) => (
      <span>
        {q.agents_on_call}
        <span className="text-muted-foreground"> on call</span>
      </span>
    ),
    sortValue: (q) => q.agents_on_call,
    align: "right",
  },
  {
    key: "forecast",
    header: "Vs forecast",
    cell: (q) => <MetricDelta value={q.volume_vs_forecast_pct} invert />,
    sortValue: (q) => q.volume_vs_forecast_pct,
    align: "right",
  },
  {
    key: "trend",
    header: "Wait trend",
    cell: (q) => (
      <Sparkline
        points={q.wait_trend_sec}
        status={q.sla_status === "healthy" ? undefined : q.sla_status}
        label={`Longest wait trend for ${q.name}, from ${q.wait_trend_sec[0] ?? 0}s to ${q.wait_trend_sec[q.wait_trend_sec.length - 1] ?? 0}s`}
      />
    ),
    align: "right",
  },
]

interface QueueHealthTableProps {
  queues: Queue[]
  feed?: Feed
}

export function QueueHealthTable({ queues, feed }: QueueHealthTableProps) {
  const rows = [...queues].sort(compareQueuesBySeverity)

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(q) => q.queue_id}
      caption="Queues ordered by SLA severity: breaching first, then at risk, then healthy. Shows longest wait against each queue's own target, backlog, staffing, volume versus forecast, and the wait trend."
      feed={feed}
      emptyTitle="No queues reporting"
      emptyDescription="Queues appear as soon as the feed reports them."
      rowTone={(q) => (q.sla_status === "healthy" ? "muted" : "default")}
      defaultSort={{ key: "status", direction: "asc" }}
      skeletonRows={6}
    />
  )
}
