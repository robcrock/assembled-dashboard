// The expanded pull list for one queue: who can help, ranked by how fast the
// capacity comes back. RECOVERABLE (off-schedule agents skilled here — the
// fastest fix, often the cause) outranks CROSS-TRAINED (adherent agents who
// could shift in), the same ordering the model derives. Copy is tactical on
// purpose: tier label, name, state · time, cost — every word earns its
// density or gets cut.
//
// The cost note is PLAIN TEXT: an inline status glyph inside a parenthetical
// never sits cleanly on the text line, and the row's leading glyph already
// carries shape — "(at risk)" in words is the aligned, honest form.

import type { ReactNode } from "react"

import { Callout } from "@workspace/ui/components/callout"
import { Duration } from "@workspace/ui/components/duration"
import { StatusDot } from "@workspace/ui/components/status-badge"

import { AGENT_STATE_LABEL } from "@/lib/agent-state"
import type {
  CoverageCandidate,
  QueueCoverage,
} from "@/features/queue-health/model/coverage"

/** What pulling this agent costs, in words. */
function pulledFromNote({ pulledFrom }: CoverageCandidate): string {
  if (pulledFrom.length === 0) return "no other queues"
  const names = pulledFrom.map((q) =>
    q.sla_status === "healthy"
      ? q.name
      : `${q.name} (${q.sla_status === "breached" ? "breached" : "at risk"})`
  )
  return `also covers ${names.join(", ")}`
}

function CandidateRow({
  status,
  candidate,
  children,
}: {
  status: "out_of_adherence" | "adherent"
  candidate: CoverageCandidate
  /** The state · duration fragment for this tier. */
  children: ReactNode
}) {
  return (
    // items-start, not items-baseline: StatusDot is one line tall (h-lh) and
    // centers its glyph on the first line box — see the component's note.
    <li className="flex flex-wrap items-start gap-x-2">
      <StatusDot status={status} decorative />
      <span className="font-medium">{candidate.agent.name}</span>
      <span className="text-muted-foreground">{children}</span>
      <span className="text-muted-foreground">{pulledFromNote(candidate)}</span>
    </li>
  )
}

interface QueueCoveragePanelProps {
  queueName: string
  coverage: QueueCoverage
}

export function QueueCoveragePanel({
  queueName,
  coverage,
}: QueueCoveragePanelProps) {
  const { recoverable, shiftable } = coverage

  if (recoverable.length === 0 && shiftable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No agents cover {queueName}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {recoverable.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-label text-muted-foreground">Recoverable</h3>
          <ul className="flex flex-col gap-1">
            {recoverable.map((candidate) => (
              <CandidateRow
                key={candidate.agent.agent_id}
                status="out_of_adherence"
                candidate={candidate}
              >
                {AGENT_STATE_LABEL[candidate.agent.state]}
                <span aria-hidden> · </span>
                <Duration seconds={candidate.agent.out_of_adherence_sec} /> out
              </CandidateRow>
            ))}
          </ul>
        </section>
      )}

      {shiftable.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-label text-muted-foreground">Cross-trained</h3>
          <ul className="flex flex-col gap-1">
            {shiftable.map((candidate) => (
              <CandidateRow
                key={candidate.agent.agent_id}
                status="adherent"
                candidate={candidate}
              >
                {AGENT_STATE_LABEL[candidate.agent.state]}
                <span aria-hidden> · </span>
                <Duration seconds={candidate.agent.state_duration_sec} />
              </CandidateRow>
            ))}
          </ul>
        </section>
      )}

      <Callout>
        Shared capacity: pulling an agent here drains the queues they also
        cover.
      </Callout>
    </div>
  )
}
