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
    (a) => a.adherence_status === "out_of_adherence",
  )
  const adherentCount = agents.length - needingAttention.length

  const columns: DataTableColumn<Agent>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (a) => (
        <span className="text-foreground font-medium">{a.name}</span>
      ),
      sortValue: (a) => a.name,
    },
    {
      key: "adherence",
      header: "Adherence",
      cell: (a) => <StatusBadge status={a.adherence_status} />,
    },
    {
      key: "state",
      header: "State",
      cell: (a) => (
        <span>
          {AGENT_STATE_LABEL[a.state]}
          <span className="text-muted-foreground">
            {" "}
            · <Duration seconds={a.state_duration_sec} />
          </span>
        </span>
      ),
      sortValue: (a) => AGENT_STATE_LABEL[a.state],
    },
    {
      key: "out-for",
      header: "Out for",
      cell: (a) => <Duration seconds={a.out_of_adherence_sec} />,
      sortValue: (a) => a.out_of_adherence_sec,
      align: "right",
    },
    {
      key: "queues",
      header: "Queues",
      cell: (a) => (
        <span className="text-muted-foreground">
          {a.queues.map((id) => queueNamesById[id] ?? id).join(", ")}
        </span>
      ),
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
        emptyTitle="All agents adherent"
        emptyDescription="Everyone is where the schedule expects them."
        defaultSort={{ key: "out-for", direction: "desc" }}
        skeletonRows={3}
      />
      {status !== "loading" && status !== "error" && agents.length > 0 && (
        <p className="text-muted-foreground text-metric-sm mt-2">
          {adherentCount} of {agents.length} agents adherent
        </p>
      )}
    </div>
  )
}
