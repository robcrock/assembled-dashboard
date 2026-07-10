// Agent entity + adherence value concepts. Pure TS — no React imports.
//
// Field names mirror the wire format 1:1 (see queue.ts for the rationale).
// The attention filter (which agents surface on the dashboard) is a product
// decision owned by the slice's components, not the entity.

export type AdherenceStatus = "adherent" | "out_of_adherence"

export type AgentState =
  | "available"
  | "on_call"
  | "on_break"
  | "in_meeting"
  | "offline"

export interface Agent {
  agent_id: string
  name: string
  /** Queue ids this agent is trained on — the link from a missing agent to a bleeding queue. */
  queues: string[]
  state: AgentState
  state_since: string
  state_duration_sec: number
  adherence_status: AdherenceStatus
  out_of_adherence_since: string | null
  out_of_adherence_sec: number
}
