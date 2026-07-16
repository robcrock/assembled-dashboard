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
// - Volume (headed "Actual / forecast" — the header names what the cell
//   shows) reuses the same deviation anatomy (actual / forecast over a bar
//   whose baseline dot is the forecast) fully colorless: over-forecast is
//   the leading indicator of the next breach, not a verdict — direction reads
//   from the bar crossing the dot, and orange stays reserved for actual breach.
// - Healthy tail keeps FULL ink: muted text is reserved for genuine sub-text
//   (the lever line), never for whole rows of data a manager still reads.
//   De-emphasis rides on the severity sort and the status column alone —
//   healthy's grey badge IS the quiet register (the urgency ramp's floor).
// - Breached rows say HOW FAR past the promise, in the status badge itself.
// - Wait trend renders as bars judged against the queue's OWN SLA target:
//   over-target samples light up, the rest stay neutral. That makes "how
//   often did we cross the promise" legible without a directional arrow —
//   and it's a rendered annotation only, never a sort key; the triage order
//   is severity + headroom.
// - Each row expands to its "who can help" coverage roster (recover the
//   out-of-adherence agent first, then shift a cross-trained one), derived
//   from the SAME agent pool the adherence table reads.
//
// INTERACTIVE (opt-in, threaded from the template). The load-bearing edit is
// the SLA TARGET (sla_target_sec, the promise). It lives on the HEADROOM
// column — the cell that shows "wait / target" — because the Status badge is
// DERIVED from it; on commit the overlay re-derives the badge, the headroom,
// and the summary alarm counts (it keys on the field, not the column). Name is
// a text edit, forecast a planning number. The Status badge, waiting, coverage
// and trend stay read-only: `QueueSetting` leaves them out, so saying otherwise
// is a compile error rather than a code review.
//
// Every column speaks ONE grammar: `cell(row, content)` writes the anatomy
// once, and the settable figure is marked in place. There is no second
// renderer and no edit binding to keep in sync with it.

import { useMemo } from "react"

import { Duration } from "@workspace/ui/components/duration"
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { DeviationBar } from "@workspace/ui/components/deviation-bar"
import { DeviationCell } from "@workspace/ui/components/deviation-cell"
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
  type QueueSetting,
} from "@/features/queue-health/model/queue"

/** The write half the template threads in; absent ⇒ the read-only table, unchanged. */
export interface QueueTableInteractive {
  onPatch: (queueId: string, patch: Record<string, unknown>) => void
  onDelete: (queueIds: string[]) => void
  editing: boolean
  onEditingChange: (editing: boolean) => void
}

interface QueueHealthTableProps {
  queues: Queue[]
  /** The shared agent pool — powers the per-queue "who can help" detail. */
  agents?: CoverageAgent[]
  feed?: Feed
  interactive?: QueueTableInteractive
}

export function QueueHealthTable({
  queues,
  agents = [],
  feed,
  interactive,
}: QueueHealthTableProps) {
  const rows = useMemo(
    () => [...queues].sort(compareQueuesBySeverity),
    [queues]
  )

  const coverageByQueue = useMemo(() => {
    const map = new Map<string, QueueCoverage>()
    for (const queue of queues) {
      map.set(queue.queue_id, deriveQueueCoverage(queue, queues, agents))
    }
    return map
  }, [queues, agents])

  // `QueueSetting` is the whole edit contract: every `edits` key below is
  // checked against it, so a column cannot offer to edit an observation.
  const columns = useMemo<DataTableColumn<Queue, QueueSetting>[]>(
    () => [
      // Queue name leads: it's a queue table, so the entity being ranked is
      // the first thing the eye lands on; the status verdict reads second.
      // Column widths (layout="fixed" below): live cells widen tick to tick —
      // a badge gains "· 1m 20s over", a lever line appears — and auto layout
      // would re-solve every column each time, jittering the whole grid. Each
      // width clears its column's widest realistic content; together they fit
      // the page's max-w-6xl budget without overflowing into a scrollbar.
      {
        key: "queue",
        header: "Queue",
        // A whole-cell setting: the name IS the content, so the anatomy is the
        // content and nothing else. The emphasis stays on the cell — `show`
        // sets no type scale, so `font-medium` here reaches the value in every
        // state rather than only the one an author remembered to style.
        cell: (q, content) => (
          <span className="font-medium">{content.text({ edits: "name" })}</span>
        ),
        sortValue: (q) => q.name,
        // w-36, not w-32: under layout="fixed" a column must clear its widest
        // realistic content, and in edit mode that content is the boxed value
        // — whose border and padding eat ~18px that "General Support" needs.
        // Sizing for the wider face keeps the name readable in BOTH modes.
        className: "w-36",
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
        // Clears the widest tick, "Breached · 1m 20s over" — measured at 193px
        // including cell padding (and 201px for a suffix as long as
        // "12m 30s over"), so w-56's 208px holds with room. The step it gave
        // back funds the Queue column's edit-mode frame; w-60 was slack.
        className: "w-56",
        // Read-only verdict: the badge is DERIVED from target vs. wait. What an
        // operator controls is the PROMISE (the SLA target), and that editor now
        // lives on the Headroom column — the cell that actually shows the target,
        // beside the wait it's measured against. Editing the target there
        // re-derives this badge (the overlay keys on the field, not the column).
      },
      // Demand and capacity (waiting, coverage) read before the derived
      // pressure metrics: how deep is the line and who's on it, then how
      // that translates against the promise.
      {
        key: "waiting",
        header: "Waiting",
        cell: (q) => q.tickets_waiting,
        sortValue: (q) => q.tickets_waiting,
        className: "w-24",
      },
      {
        key: "coverage",
        header: "Coverage",
        // Occupancy + levers. on_call = OCCUPIED on a contact (see
        // lib/agent-state.ts), so the primary line reads "on calls" — "on
        // call" would misread as rostered. The primary line rides in row
        // ink; the levers (idle capacity, recoverable capacity) are the
        // muted sub-text and appear only when non-zero: an absent lever
        // line IS the no-slack signal.
        cell: (q) => {
          const recoverable =
            coverageByQueue.get(q.queue_id)?.recoverable.length ?? 0
          const levers = [
            q.agents_available > 0 && `${q.agents_available} available`,
            recoverable > 0 && `${recoverable} recoverable`,
          ].filter(Boolean)
          return (
            <div className="flex flex-col items-start">
              <span>
                {q.agents_on_call}
                {q.agents_on_call === 1 ? " on a call" : " on calls"}
              </span>
              {levers.length > 0 && (
                <span className="text-metric-sm text-muted-foreground">
                  {levers.join(" · ")}
                </span>
              )}
            </div>
          )
        },
        sortValue: (q) => q.agents_on_call,
        // clears the two-lever line ("1 available · 1 recoverable")
        className: "w-44",
      },
      {
        key: "headroom",
        header: "Headroom",
        // A bullet graph (DeviationCell): the measures left, the percent
        // right, over a diverging bar whose baseline dot is the target itself.
        // The whole cell is neutral — the status verdict rides in the Status
        // badge, so the percent stays a plain colorless annotation.
        //
        // ONE anatomy, every state. The editable half of this observed/target
        // pair is the TARGET (the promise); the wait beside it is measured, and
        // the bar and percent are derived from both. The badge is derived too,
        // which is why the target is edited HERE — on the cell that actually
        // shows it, beside the wait it is measured against.
        //
        // What this replaced: `cell` + `editCell` + `renderField` wrote this
        // anatomy three times and they disagreed. `renderField` had NO
        // DeviationBar, so clicking the cell DELETED the bar and dropped the
        // number ~6px — every row, every click. There is no second tree to
        // forget the bar in now.
        cell: (q, content) => (
          <DeviationCell
            measures={
              <>
                <Duration seconds={q.longest_wait_sec} /> /{" "}
                {content.duration({
                  edits: "sla_target_sec",
                  min: 10,
                  max: 86_400,
                })}
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
        // the DeviationCell's fixed w-36 plus cell padding, exactly
        className: "w-40",
      },
      {
        key: "forecast",
        header: "Actual / forecast",
        // Headroom's twin, and now visibly the twin: same anatomy, same shape,
        // same one editable half. The forecast is a PLAN — the one figure an
        // operator controls here; the actual beside it is measured. Deliberately
        // COLORLESS: the bar's baseline dot is the forecast, but over-forecast
        // is a leading indicator, not a verdict — no status tint, stock muted
        // delta.
        cell: (q, content) => (
          <DeviationCell
            measures={
              <>
                {q.volume_last_15m} /{" "}
                {content.number({ edits: "volume_forecast_next_15m", min: 0 })}
              </>
            }
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
        className: "w-40",
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
        className: "w-24",
      },
    ],
    [coverageByQueue]
  )

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(q) => q.queue_id}
      caption="Queues ordered by SLA severity: breaching first, then at risk, then healthy. Shows backlog, coverage, SLA headroom against each queue's own target, actual volume versus forecast, and the wait trend. Expand a row to see which agents can help that queue."
      feed={feed}
      // the template's chrome StaleIndicator is the page's ONE stale note
      staleNote={false}
      emptyTitle="No queues reporting"
      emptyDescription="Queues appear as soon as the feed reports them."
      getExpandedContent={(q) => {
        const coverage = coverageByQueue.get(q.queue_id)
        return coverage ? (
          <QueueCoveragePanel queueName={q.name} coverage={coverage} />
        ) : null
      }}
      expandLabel={(q) => `${q.name} coverage`}
      defaultSort={{ key: "status", direction: "asc" }}
      skeletonRows={6}
      // tall: the deviation cells and lever sub-lines are two-line anatomies;
      // the rhythm must clear the tallest cell or loading -> live shifts
      rowSize="tall"
      // fixed: ticking cells (badge suffixes, lever lines) must never
      // re-solve the grid — widths live on the columns above
      layout="fixed"
      interactive={
        interactive && {
          rowLabel: (q) => q.name,
          onPatch: (queueId, patch) => interactive.onPatch(queueId, patch),
          onDelete: (queueIds) => interactive.onDelete(queueIds),
          editing: interactive.editing,
          onEditingChange: interactive.onEditingChange,
          // The section heading carries the Edit toggle — a section-scoped
          // action belongs beside the thing it acts on, not stacked above
          // the table. Mode stays controlled from the template either way.
          editToggle: false,
          // Clear rows rides up there too, which leaves this table's toolbar
          // empty until a selection exists — so entering edit mode adds no
          // strip above the rows and moves nothing on the page.
          clearRows: false,
        }
      }
    />
  )
}
