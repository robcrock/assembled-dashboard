// The write-side overlay — local edits and deletes applied over every
// replayed frame. Pure TS.
//
// Lives at the app tier beside dashboard-frame.ts for the same reason: it
// composes entities from all three feature slices, and slices never import
// each other's models (dependency direction: app/hooks → features → lib).
//
// Why an overlay instead of mutating the payload: the store REPLAYS frames —
// display is `frames[i]`, re-picked every tick. An edit baked into one frame
// would vanish on the next tick; an edit applied to the payload would fight
// the replay's own progression. The overlay is the durable local truth
// (what did the operator change), re-applied to WHATEVER frame the replay
// serves — so edits survive ticks by construction ("sticky", strain #7).
//
// After merging a queue patch the queue is re-derived (rederiveQueue): a new
// sla_target_sec must move the badge, the headroom, and the summary counts,
// or the page lies. Agent patches merge without re-derivation — adherence is
// derived from schedule data this feed doesn't carry, so the server-baked
// verdict stands (documented limitation, not an oversight).

import type { Agent } from "@/features/agent-adherence/model/agent"
import { rederiveQueue, type Queue } from "@/features/queue-health/model/queue"
import type { Summary } from "@/features/summary/model/summary"
import type { DashboardFrame } from "@/hooks/dashboard-frame"

export interface DashboardOverlay {
  queuePatches: ReadonlyMap<string, Partial<Queue>>
  agentPatches: ReadonlyMap<string, Partial<Agent>>
  deletedQueues: ReadonlySet<string>
  deletedAgents: ReadonlySet<string>
}

export const EMPTY_OVERLAY: DashboardOverlay = {
  queuePatches: new Map(),
  agentPatches: new Map(),
  deletedQueues: new Set(),
  deletedAgents: new Set(),
}

export function isOverlayEmpty(overlay: DashboardOverlay): boolean {
  return (
    overlay.queuePatches.size === 0 &&
    overlay.agentPatches.size === 0 &&
    overlay.deletedQueues.size === 0 &&
    overlay.deletedAgents.size === 0
  )
}

/**
 * Summary counts re-derived after a mutation changes what exists on the
 * floor — deleting a breached queue must drop the alarm count beside it.
 * `sla_attainment_pct` is deliberately carried through untouched: it is a
 * WINDOWED aggregate (attainment over time) neither side has honest inputs
 * to recompute. Exported because the write ROUTE re-derives the same way
 * after committing to its server copy — one implementation, no drift.
 */
export function recomputeSummary(
  prev: Summary,
  queues: Queue[],
  agents: Agent[]
): Summary {
  return {
    ...prev,
    queues_total: queues.length,
    queues_breaching: queues.filter((q) => q.sla_status === "breached").length,
    queues_at_risk: queues.filter((q) => q.sla_status === "at_risk").length,
    tickets_waiting_total: queues.reduce((n, q) => n + q.tickets_waiting, 0),
    agents_total: agents.length,
    agents_online: agents.filter((a) => a.state !== "offline").length,
    agents_out_of_adherence: agents.filter(
      (a) => a.adherence_status === "out_of_adherence"
    ).length,
  }
}

/** One frame through the overlay: drop deleted, merge patches, re-derive. */
export function applyOverlay(
  frame: DashboardFrame,
  overlay: DashboardOverlay
): DashboardFrame {
  if (isOverlayEmpty(overlay)) return frame

  const queues = frame.queues
    .filter((q) => !overlay.deletedQueues.has(q.queue_id))
    .map((q) => {
      const patch = overlay.queuePatches.get(q.queue_id)
      return patch ? rederiveQueue({ ...q, ...patch }) : q
    })

  const agents = frame.agents
    .filter((a) => !overlay.deletedAgents.has(a.agent_id))
    .map((a) => {
      const patch = overlay.agentPatches.get(a.agent_id)
      return patch ? { ...a, ...patch } : a
    })

  return {
    ...frame,
    queues,
    agents,
    summary: recomputeSummary(frame.summary, queues, agents),
  }
}
