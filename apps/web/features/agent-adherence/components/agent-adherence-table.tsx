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
// they are observations, and `AgentSetting` leaves them out, so saying
// otherwise is a compile error rather than a code review.
//
// Every column speaks ONE grammar: `cell(row, content)` writes the anatomy
// once, and the parts an operator controls are built with the `content`
// builder in place. There is no second renderer and no edit binding to keep in
// sync with it.

import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { Duration } from "@workspace/ui/components/duration"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { Feed } from "@workspace/ui/lib/feed"

import { AGENT_STATE_LABEL, type AgentStateKey } from "@/lib/agent-state"
import type {
  Agent,
  AgentSetting,
} from "@/features/agent-adherence/model/agent"

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

  // `AgentSetting` is the whole edit contract: every `edits` key below is
  // checked against it, so a column cannot offer to edit an observation.
  const columns: DataTableColumn<Agent, AgentSetting>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (a, content) => (
        <span className="font-medium text-foreground">
          {content.text({ edits: "name" })}
        </span>
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
      // ONE anatomy, every state. The state is a setting, so it is built with
      // the content builder; the clock beside it is an observation, so it is
      // written as the primitive it is — once, in row ink, at the row's own
      // scale. It has no second copy to disagree with.
      //
      // What this replaced: `cell` + `editCell` + `renderField` wrote this
      // same line three times, and the copies had drifted. `editCell`
      // re-declared the clock as `text-metric-sm text-muted-foreground`, so
      // merely ENTERING edit mode restyled every clock on the floor (14px →
      // 12px, row ink → muted) and moved it 39px right — without a click, on
      // rows nobody was editing. There is no branch here to get that wrong.
      cell: (a, content) => (
        <span>
          {content.enum({ edits: "state", options: AGENT_STATE_OPTIONS })} ·{" "}
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
      // The cause→symptom link (Jordan → Billing) — primary data, row ink.
      // The names an operator can ASSIGN come from the same map the read face
      // renders, so an id the table can display is exactly an id the picker can
      // assign; that was already true, and now it is true because there is one
      // declaration rather than two that agreed.
      cell: (a, content) =>
        content.multiselect({ edits: "queues", options: queueOptions }),
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
      {status !== "loading" && status !== "error" && agents.length > 0 && (
        <p className="mt-2 text-metric-sm text-muted-foreground">
          {adherentCount} of {agents.length} agents adherent
        </p>
      )}
    </div>
  )
}
