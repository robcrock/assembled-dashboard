// The frame envelope — the contract between GET /api/dashboard and the
// live-data store (use-dashboard-data.ts, ROB-50).
//
// This lives at the app tier (beside its consumer, the hook) rather than in
// lib/: it composes entities from all three feature slices, and lib/ must
// never import feature code (dependency direction: app/hooks → features → lib).

import type { Agent } from "@/features/agent-adherence/model/agent"
import type { Queue } from "@/features/queue-health/model/queue"
import type { Summary } from "@/features/summary/model/summary"

/** One tick: the complete dashboard state at a timestamp. */
export interface DashboardFrame {
  ts: string
  summary: Summary
  queues: Queue[]
  agents: Agent[]
}

export interface DashboardMeta {
  org: string
  window_start: string
  tick_interval_sec: number
  notes: string
}

/** The full payload GET /api/dashboard returns: `current` plus replayable `history`. */
export interface DashboardPayload {
  generated_at: string
  meta: DashboardMeta
  current: DashboardFrame
  history: DashboardFrame[]
}
