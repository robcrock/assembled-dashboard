// Queue entity + SLA value concepts. Pure TS — no React imports.
//
// Field names mirror the wire format (dashboard_state.json) 1:1: the fixture
// is already the shape a metrics API hands the frontend, and a renaming layer
// would buy nothing but drift. Pre-computed fields (sla_status, *_pct) are
// trusted as-is — the server is the source of truth for classification; the
// raw inputs (longest_wait_sec, sla_target_sec) stay available for display.

export type SlaStatus = "healthy" | "at_risk" | "breached"

export interface Queue {
  queue_id: string
  name: string
  sla_status: SlaStatus
  sla_target_sec: number
  longest_wait_sec: number
  /** Signed % of the SLA window consumed past target; positive = past target. */
  sla_headroom_pct: number
  tickets_waiting: number
  agents_available: number
  agents_on_call: number
  volume_last_15m: number
  volume_forecast_next_15m: number
  /** Signed % of actual volume vs. forecast; positive = running over forecast. */
  volume_vs_forecast_pct: number
  wait_trend_sec: number[]
}

/** Lower rank = more urgent. The triage ordering of the whole dashboard. */
export const SLA_SEVERITY: Record<SlaStatus, number> = {
  breached: 0,
  at_risk: 1,
  healthy: 2,
}

/**
 * The single triage sort key: severity band first, then depth past the queue's
 * own target (higher headroom = further past — never raw wait seconds, since a
 * 370s wait can be healthy against a 30-min promise). Lower rank = more urgent.
 *
 * Both the pre-sort comparator below AND the queue table's status column sort
 * by this one function, so the two orderings cannot drift.
 */
export function queueSeverityRank(q: Queue): number {
  return SLA_SEVERITY[q.sla_status] * 10_000 - q.sla_headroom_pct
}

/** Full triage order: severity rank, then biggest backlog, then name (stable). */
export function compareQueuesBySeverity(a: Queue, b: Queue): number {
  return (
    queueSeverityRank(a) - queueSeverityRank(b) ||
    b.tickets_waiting - a.tickets_waiting ||
    a.name.localeCompare(b.name)
  )
}

export type TrendDirection = "rising" | "falling" | "flat"

/**
 * Direction of the wait trend, derived from the tail of `wait_trend_sec` —
 * a rendered ANNOTATION only (↑ climbing / ↓ recovering), never a sort key
 * (the triage order is severity + headroom; see queueSeverityRank).
 *
 * Compares the last sample against one three ticks back (15 fixture-minutes),
 * so a single noisy tick doesn't flip the arrow. Changes within ±5% of the
 * older sample read as flat.
 */
export function waitTrendDirection(trend: number[]): TrendDirection {
  const last = trend[trend.length - 1]
  const prior = trend[Math.max(0, trend.length - 4)]
  if (last === undefined || prior === undefined) return "flat"
  const tolerance = Math.abs(prior) * 0.05
  if (last > prior + tolerance) return "rising"
  if (last < prior - tolerance) return "falling"
  return "flat"
}
