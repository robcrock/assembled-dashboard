// Display copy for the AgentState domain enum — pure TS, no React.
//
// Lives in lib because two slices render it (agent-adherence's table and
// queue-health's coverage panel): "anything two slices need moves to lib".
// Keyed on the shared wire values, so each slice's structural agent type
// (Agent, CoverageAgent) indexes it without importing the other's model.
// One phrasing per state — the two hand-rolled copies had diverged.
//
// on_call means OCCUPIED on a contact, not "rostered/available": the enum
// carries a separate `available` state, and per-queue agents_on_call equals
// the count of skilled agents in this state. Hence "On a call" — "On call"
// would misread as on-rota.

export const AGENT_STATE_LABEL = {
  available: "Available",
  on_call: "On a call",
  on_break: "On break",
  in_meeting: "In meeting",
  offline: "Offline",
} as const

export type AgentStateKey = keyof typeof AGENT_STATE_LABEL
