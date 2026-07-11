// The expanded "who can help" panel for one queue — the domain wiring lives
// here in the slice, built from existing primitives (StatusDot, Duration);
// no new primitive needed. Two rungs, fastest-recoverable first (§ model):
// recover the out-of-adherence agent, then shift a cross-trained one — and
// every candidate is annotated with what they'd be pulled FROM, because
// capacity is shared, never free.

import { Duration } from "@workspace/ui/components/duration"
import { StatusDot } from "@workspace/ui/components/status-badge"

import type {
  CoverageAgentState,
  CoverageCandidate,
  QueueCoverage,
} from "@/features/queue-health/model/coverage"

const STATE_LABEL: Record<CoverageAgentState, string> = {
  available: "Available",
  on_call: "On a call",
  on_break: "On break",
  in_meeting: "In meeting",
  offline: "Offline",
}

function PulledFromNote({ candidate }: { candidate: CoverageCandidate }) {
  if (candidate.pulledFrom.length === 0) {
    return <span className="text-muted-foreground">only skilled here</span>
  }
  return (
    <span className="text-muted-foreground">
      also covers{" "}
      {candidate.pulledFrom.map((q, i) => (
        <span key={q.queue_id}>
          {i > 0 && ", "}
          {q.name}
          {q.sla_status !== "healthy" && (
            <span>
              {" "}
              (<StatusDot status={q.sla_status} decorative className="mr-0.5 align-baseline" />
              {q.sla_status === "breached" ? "breached" : "at risk"})
            </span>
          )}
        </span>
      ))}
    </span>
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
      <p className="text-muted-foreground text-sm">
        No agents are skilled on {queueName}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {recoverable.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground text-xs font-medium">
            Recover first — out of adherence, skilled on {queueName}
          </h3>
          <ul className="flex flex-col gap-1">
            {recoverable.map(({ agent, pulledFrom }) => (
              <li key={agent.agent_id} className="flex flex-wrap items-baseline gap-x-2">
                <StatusDot status="out_of_adherence" decorative />
                <span className="font-medium">{agent.name}</span>
                <span className="text-muted-foreground">
                  {STATE_LABEL[agent.state]} ·{" "}
                  <Duration seconds={agent.out_of_adherence_sec} /> out of
                  adherence
                </span>
                <PulledFromNote candidate={{ agent, pulledFrom }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {shiftable.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground text-xs font-medium">
            Or shift a cross-trained agent — on a call now, skilled on{" "}
            {queueName}
          </h3>
          <ul className="flex flex-col gap-1">
            {shiftable.map(({ agent, pulledFrom }) => (
              <li key={agent.agent_id} className="flex flex-wrap items-baseline gap-x-2">
                <StatusDot status="adherent" decorative />
                <span className="font-medium">{agent.name}</span>
                <span className="text-muted-foreground">
                  {STATE_LABEL[agent.state]} ·{" "}
                  <Duration seconds={agent.state_duration_sec} />
                </span>
                <PulledFromNote candidate={{ agent, pulledFrom }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Capacity is shared — every agent here is counted on every queue they
        cover, so helping {queueName} pulls coverage from the queues listed.
      </p>
    </div>
  )
}
