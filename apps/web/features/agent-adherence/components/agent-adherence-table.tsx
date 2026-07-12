"use client"

// "Where's my missing capacity?" — the panel that explains the queue panel.
// Surfaces ONLY agents out of adherence (the attention filter is this
// product call: adherence already means "not where the schedule says", so an
// adherent-but-offline agent is simply scheduled off). The adherent majority
// stays reachable as a one-line count below the table — visible, not hidden
// behind a toggle, but never competing with the exceptions.
//
// Second real consumer of the DataTable column config — the proof it
// generalizes past queues.

import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { Duration } from "@workspace/ui/components/duration"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { Feed } from "@workspace/ui/lib/feed"

import { AGENT_STATE_LABEL } from "@/lib/agent-state"
import type { Agent } from "@/features/agent-adherence/model/agent"

interface AgentAdherenceTableProps {
  agents: Agent[]
  feed?: Feed
  /** Queue id → display name, provided by the composition root — slices never import each other's models. */
  queueNamesById?: Record<string, string>
}

export function AgentAdherenceTable({
  agents,
  feed,
  queueNamesById = {},
}: AgentAdherenceTableProps) {
  const status = feed?.status ?? "live"
  const needingAttention = agents.filter(
    (a) => a.adherence_status === "out_of_adherence"
  )
  const adherentCount = agents.length - needingAttention.length

  // Column widths (layout="fixed" below): the two duration cells re-render
  // every tick, and auto layout would re-solve the grid whenever one gains a
  // digit. Sized columns clear their widest realistic content; Agent and
  // Queues stay unsized and split the remainder — their text is stable per
  // row, so they can't jitter.
  const columns: DataTableColumn<Agent>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (a) => (
        <span className="font-medium text-foreground">{a.name}</span>
      ),
      sortValue: (a) => a.name,
    },
    {
      key: "adherence",
      header: "Adherence",
      cell: (a) => <StatusBadge status={a.adherence_status} />,
      // clears the wider badge, "Out of adherence"
      className: "w-44",
    },
    {
      key: "state",
      header: "State",
      cell: (a) => (
        <span>
          {AGENT_STATE_LABEL[a.state]} ·{" "}
          <Duration seconds={a.state_duration_sec} />
        </span>
      ),
      sortValue: (a) => AGENT_STATE_LABEL[a.state],
      // clears the longest state + duration ("In a meeting · 25m 30s")
      className: "w-48",
    },
    {
      key: "out-for",
      header: "Out for",
      cell: (a) => <Duration seconds={a.out_of_adherence_sec} />,
      sortValue: (a) => a.out_of_adherence_sec,
      className: "w-24",
    },
    {
      key: "queues",
      header: "Queues",
      // the cause→symptom link (Jordan → Billing) — primary data, row ink
      cell: (a) => a.queues.map((id) => queueNamesById[id] ?? id).join(", "),
    },
  ]

  return (
    <div>
      <DataTable
        columns={columns}
        rows={needingAttention}
        rowKey={(a) => a.agent_id}
        caption="Agents out of adherence, longest out first, with their current state and the queues they cover."
        feed={feed}
        // the template's chrome StaleIndicator is the page's ONE stale note
        staleNote={false}
        emptyTitle="All agents adherent"
        emptyDescription="Everyone is where the schedule expects them."
        defaultSort={{ key: "out-for", direction: "desc" }}
        skeletonRows={3}
        // fixed: the ticking duration cells must never re-solve the grid —
        // widths live on the columns above
        layout="fixed"
      />
      {status !== "loading" && status !== "error" && agents.length > 0 && (
        <p className="mt-2 text-metric-sm text-muted-foreground">
          {adherentCount} of {agents.length} agents adherent
        </p>
      )}
    </div>
  )
}
