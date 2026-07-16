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

/**
 * The agent figures an operator controls: who they are, what they're doing
 * right now, and which queues they're trained on. Every other key on `Agent`
 * is an OBSERVATION — measured, derived, or a verdict — and an editable
 * observation would be a lie about the floor.
 *
 * The word "observation" appears nowhere in the code: it is expressed by
 * ABSENCE from this union, and the compile error is the word. `adherence_status`
 * is a verdict about whether the agent is where the schedule says; the clocks
 * (`state_duration_sec`, `out_of_adherence_sec`) are measured from
 * `state_since` / `out_of_adherence_since`. Typing a new number into any of
 * them would change what the floor REPORTS without changing what the floor IS.
 *
 * No `readOnly` flag to forget: you declared it here or you didn't.
 */
export type AgentSetting = "name" | "state" | "queues"
