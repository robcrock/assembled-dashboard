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
//
// INTERACTIVE (opt-in, threaded from the template): name is a text edit,
// state an enum pick, queue membership a multi-select over the same
// queueNamesById the read face renders from — the write face and the read
// face share one options source, so an id the table can display is exactly
// an id the editor can assign. Adherence and the clocks stay read-only:
// they are observations. Edit bindings ride the columns' OBJECT form
// (edit: { field, get, type }) because these columns keep their hand-wired
// display cells — the type supplies only the edit face.

import {
  columnTypes,
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { Duration } from "@workspace/ui/components/duration"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { Feed } from "@workspace/ui/lib/feed"

import { AGENT_STATE_LABEL, type AgentStateKey } from "@/lib/agent-state"
import type { Agent } from "@/features/agent-adherence/model/agent"

/** The write half the template threads in; absent ⇒ the read-only table, unchanged. */
export interface AgentTableInteractive {
  onPatch: (agentId: string, patch: Record<string, unknown>) => void
  onDelete: (agentIds: string[]) => void
  editing: boolean
  onEditingChange: (editing: boolean) => void
}

const AGENT_STATE_OPTIONS = (
  Object.entries(AGENT_STATE_LABEL) as [AgentStateKey, string][]
).map(([value, label]) => ({ value, label }))

interface AgentAdherenceTableProps {
  agents: Agent[]
  feed?: Feed
  /** Queue id → display name, provided by the composition root — slices never import each other's models. */
  queueNamesById?: Record<string, string>
  interactive?: AgentTableInteractive
}

export function AgentAdherenceTable({
  agents,
  feed,
  queueNamesById = {},
  interactive,
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
  // The write face's queue options come from the SAME map the read face
  // renders names from — one source, so display and assignability agree.
  const queueOptions = Object.entries(queueNamesById).map(([value, label]) => ({
    value,
    label,
  }))

  const columns: DataTableColumn<Agent>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (a) => (
        <span className="font-medium text-foreground">{a.name}</span>
      ),
      sortValue: (a) => a.name,
      edit: { field: "name", get: (a) => a.name, type: columnTypes.text() },
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
      // The display cell pairs state with its clock; the EDIT face is just
      // the state enum — the clock is an observation, not a setting.
      edit: {
        field: "state",
        get: (a) => a.state,
        type: columnTypes.enum(AGENT_STATE_OPTIONS),
      },
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
      edit: {
        field: "queues",
        get: (a) => a.queues,
        type: columnTypes.multiselect(queueOptions),
      },
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
        interactive={
          interactive && {
            rowLabel: (a) => a.name,
            onPatch: (agentId, patch) => interactive.onPatch(agentId, patch),
            onDelete: (agentIds) => interactive.onDelete(agentIds),
            editing: interactive.editing,
            onEditingChange: interactive.onEditingChange,
          }
        }
      />
      {status !== "loading" && status !== "error" && agents.length > 0 && (
        <p className="mt-2 text-metric-sm text-muted-foreground">
          {adherentCount} of {agents.length} agents adherent
        </p>
      )}
    </div>
  )
}
