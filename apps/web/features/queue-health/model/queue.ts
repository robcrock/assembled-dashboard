// Queue entity + SLA value concepts. Pure TS — no React imports.
//
// Field names mirror the wire format (dashboard_state.json) 1:1: the fixture is
// already the shape a metrics API hands the frontend, and a renaming layer would
// buy nothing but drift. Pre-computed fields (sla_status, *_pct) are trusted
// as-is — the server classifies; the raw inputs stay available for display.

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

/**
 * The queue figures an operator controls: a name, a PROMISE (`sla_target_sec`),
 * and a PLAN (`volume_forecast_next_15m`). Every other key on `Queue` is an
 * OBSERVATION — measured, derived, or a verdict — and an editable observation is
 * a lie about the floor.
 *
 * "Observation" appears nowhere in the code: it is expressed by ABSENCE from
 * this union, and the compile error is the word. The distinction is the
 * product's, not the type system's — `sla_target_sec` and `sla_headroom_pct` are
 * both `number`. That makes this a PROMISE, not a proof; its value is that the
 * decision is made ONCE, here, beside the entity, rather than re-made invisibly
 * at a dozen call sites. No `readOnly` flag to forget: you declared it or you
 * didn't.
 */
export type QueueSetting = "name" | "sla_target_sec" | "volume_forecast_next_15m"

/** Lower rank = more urgent. The triage ordering of the whole dashboard. */
export const SLA_SEVERITY: Record<SlaStatus, number> = {
  breached: 0,
  at_risk: 1,
  healthy: 2,
}

/**
 * The single triage sort key: severity band first, then depth past the queue's
 * own target — never raw wait seconds, since a 370s wait can be healthy against
 * a 30-minute promise. Both the pre-sort comparator and the table's status
 * column sort by this one function, so the two orderings cannot drift.
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

/**
 * The at-risk band: a reading within this many percent BELOW its target is
 * "approaching the promise". Reverse-engineered from the fixture's own
 * classifications (vip at −17% is at_risk, general at −37% is healthy) so
 * re-derived statuses agree with server-computed ones.
 */
export const AT_RISK_HEADROOM_PCT = -25

/**
 * Signed % of a reading against its target; positive = past it. The one shape
 * every SLA-ish band in this model is measured with.
 */
export function headroomPct(reading: number, target: number): number {
  const safe = target > 0 ? target : 1
  return Math.round(((reading - safe) / safe) * 100)
}

/** The one severity classifier. Every band on this entity comes from here. */
export function classify(headroom: number): SlaStatus {
  if (headroom > 0) return "breached"
  return headroom > AT_RISK_HEADROOM_PCT ? "at_risk" : "healthy"
}

/**
 * Re-derive a queue's computed fields from its raw inputs — the write-side
 * counterpart of "pre-computed fields are trusted as-is". Once an EDIT changes
 * an input (a new target, a new forecast), the server-baked derivations are
 * stale and the badge would lie.
 */
export function rederiveQueue(q: Queue): Queue {
  const headroom = headroomPct(q.longest_wait_sec, q.sla_target_sec)
  const forecast = q.volume_forecast_next_15m
  const vsForecast =
    forecast > 0
      ? Math.round(((q.volume_last_15m - forecast) / forecast) * 100)
      : 0
  return {
    ...q,
    sla_headroom_pct: headroom,
    volume_vs_forecast_pct: vsForecast,
    sla_status: classify(headroom),
  }
}
