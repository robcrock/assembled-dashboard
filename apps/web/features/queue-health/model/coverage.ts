// "Who can help this queue?" — pure TS, no React imports.
//
// Help is queue-specific: an agent can only work queues in their skill set
// (agent.queues[]), so coverage is derived AT the queue. Two rungs, ordered
// by how fast the capacity is recoverable:
//
//   1. RECOVERABLE — an out-of-adherence agent skilled on this queue. The
//      fastest fix and often the cause: they're already assigned here, just
//      not where the schedule says.
//   2. SHIFTABLE — a cross-trained agent currently on a call whose skills
//      include this queue. Slower (they must finish the contact) and NEVER
//      free: capacity is shared (per-queue agents_on_call overlaps via
//      multi-skilling), so every candidate is annotated with the other
//      queues they'd be pulled from.
//
// Deliberately absent: any "add N agents → clears in M minutes" math. The
// fixture has arrival data but no handle time / service rate, so this model
// classifies and points at recoverable capacity — it never prescribes a
// headcount.
//
// This slice defines its own minimal agent shape (structural — the wire
// Agent satisfies it) rather than importing agent-adherence's model: slices
// never import each other's models; the composition root passes the rows.

import {
  SLA_SEVERITY,
  type Queue,
  type SlaStatus,
} from "@/features/queue-health/model/queue"

export type CoverageAgentState =
  | "available"
  | "on_call"
  | "on_break"
  | "in_meeting"
  | "offline"

/** The slice of an agent this model needs — the wire Agent satisfies it structurally. */
export interface CoverageAgent {
  agent_id: string
  name: string
  queues: string[]
  state: CoverageAgentState
  state_duration_sec: number
  adherence_status: "adherent" | "out_of_adherence"
  out_of_adherence_sec: number
}

export interface PulledFrom {
  queue_id: string
  name: string
  sla_status: SlaStatus
}

export interface CoverageCandidate {
  agent: CoverageAgent
  /** The other queues this agent's skills cover — what helping here costs. */
  pulledFrom: PulledFrom[]
}

export interface QueueCoverage {
  /** Out-of-adherence agents skilled here — recover them first. */
  recoverable: CoverageCandidate[]
  /** Cross-trained on-call agents skilled here — shifting them costs another queue. */
  shiftable: CoverageCandidate[]
}

function pulledFromFor(
  agent: CoverageAgent,
  queueId: string,
  queuesById: Map<string, Queue>,
): PulledFrom[] {
  return agent.queues
    .filter((id) => id !== queueId)
    .map((id) => {
      const q = queuesById.get(id)
      return q
        ? { queue_id: q.queue_id, name: q.name, sla_status: q.sla_status }
        : null
    })
    .filter((q): q is PulledFrom => q !== null)
}

/**
 * Worst severity among the queues a candidate would be pulled from (lower =
 * worse). Uses the model's ONE triage ordering (SLA_SEVERITY) so coverage
 * sorting can never drift from table sorting.
 */
function pulledFromSeverity(pulledFrom: PulledFrom[]): number {
  return pulledFrom.length === 0
    ? 3 // single-skilled: helping here costs nothing
    : Math.min(...pulledFrom.map((q) => SLA_SEVERITY[q.sla_status]))
}

/**
 * Derive the coverage roster for one queue from the shared agent pool.
 * Recoverable agents sort shortest-out first (fastest to get back);
 * shiftable agents sort by how calm the queues they'd leave are (pulling
 * from a healthy queue before an at-risk one).
 */
export function deriveQueueCoverage(
  queue: Queue,
  allQueues: Queue[],
  agents: CoverageAgent[],
): QueueCoverage {
  const queuesById = new Map(allQueues.map((q) => [q.queue_id, q]))
  const skilled = agents.filter((a) => a.queues.includes(queue.queue_id))

  const recoverable = skilled
    .filter((a) => a.adherence_status === "out_of_adherence")
    .map((agent) => ({
      agent,
      pulledFrom: pulledFromFor(agent, queue.queue_id, queuesById),
    }))
    .sort((a, b) => a.agent.out_of_adherence_sec - b.agent.out_of_adherence_sec)

  const shiftable = skilled
    .filter(
      (a) => a.adherence_status === "adherent" && a.state === "on_call",
    )
    .map((agent) => ({
      agent,
      pulledFrom: pulledFromFor(agent, queue.queue_id, queuesById),
    }))
    .sort(
      (a, b) =>
        pulledFromSeverity(b.pulledFrom) - pulledFromSeverity(a.pulledFrom) ||
        a.agent.name.localeCompare(b.agent.name),
    )

  return { recoverable, shiftable }
}
