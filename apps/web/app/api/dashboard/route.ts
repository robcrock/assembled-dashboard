import { NextResponse } from "next/server"

import type { AgentState } from "@/features/agent-adherence/model/agent"
import { rederiveQueue } from "@/features/queue-health/model/queue"
import type { DashboardFrame, DashboardPayload } from "@/hooks/dashboard-frame"
import { recomputeSummary } from "@/hooks/dashboard-overlay"
import dashboardState from "@/lib/fixtures/dashboard_state.json"

// /api/dashboard — the local stand-in for a live metrics API.
//
// GET is polled from the client (see hooks/use-dashboard-data.ts); it is never
// statically cached and the app never SSR's this data. Returning the whole
// payload ({ generated_at, meta, current, history }) lets the client render
// `current` and replay `history[]` on a timer to simulate live updates.
//
// PATCH/DELETE are the write half, over an IN-MEMORY copy of the fixture —
// module-scoped, cloned on load, reset on server restart. That scope is the
// honest one for a take-home: real enough that the client's optimistic
// updates race a real endpoint (and reloads see committed writes), fake
// enough that nothing needs a database. Writes validate server-side and
// apply to `current` AND every history frame, so a replaying client that
// refetches sees a consistent world.
//
// Two query params turn a static fixture into a real fetch surface, so the
// components' loading / stale / error states are demonstrable, not
// theoretical — and they apply to WRITES too (the inject-error lever demos
// optimistic rollback):
//   ?delay=<ms>        inject latency (capped at 10s)
//   ?fail=1|<status>   respond with an error (defaults to 500)
export const dynamic = "force-dynamic"

const MAX_DELAY_MS = 10_000

// The mutable server copy. structuredClone so the static import stays
// pristine (Next may share the module registry across handlers).
const db = structuredClone(dashboardState) as unknown as DashboardPayload

/** Every frame an entity edit must land in: current + the replayable history. */
function allFrames() {
  return [db.current, ...db.history]
}

/**
 * A committed write invalidates the frame's server-baked derivations the
 * same way a client overlay does — re-derive with the SAME model functions
 * the client uses, so a reload never disagrees with the optimistic view
 * (a patched target must move the badge on both sides of the wire).
 */
function rederiveFrame(frame: DashboardFrame) {
  frame.queues = frame.queues.map(rederiveQueue)
  frame.summary = recomputeSummary(frame.summary, frame.queues, frame.agents)
}

/* ---- validation ----------------------------------------------------------
 * Field allowlists: a PATCH may only touch fields that are SETTINGS from the
 * dashboard's point of view (a name, a promise, a plan, an assignment) —
 * observations (waits, volumes, adherence clocks) are not writable, matching
 * the column type system's view-only faces.
 * ------------------------------------------------------------------------ */

const AGENT_STATES: readonly AgentState[] = [
  "available",
  "on_call",
  "on_break",
  "in_meeting",
  "offline",
]

type FieldRule = (value: unknown) => string | null

const QUEUE_FIELDS: Record<string, FieldRule> = {
  name: (v) =>
    typeof v === "string" && v.trim().length > 0
      ? null
      : "name must be a non-empty string",
  sla_target_sec: (v) =>
    typeof v === "number" && Number.isFinite(v) && v >= 10 && v <= 86_400
      ? null
      : "sla_target_sec must be a number between 10 and 86400",
  volume_forecast_next_15m: (v) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0
      ? null
      : "volume_forecast_next_15m must be a non-negative number",
}

const AGENT_FIELDS: Record<string, FieldRule> = {
  name: (v) =>
    typeof v === "string" && v.trim().length > 0
      ? null
      : "name must be a non-empty string",
  state: (v) =>
    AGENT_STATES.includes(v as AgentState)
      ? null
      : `state must be one of ${AGENT_STATES.join(", ")}`,
  queues: (v) =>
    Array.isArray(v) &&
    v.every(
      (id) =>
        typeof id === "string" &&
        db.current.queues.some((q) => q.queue_id === id)
    )
      ? null
      : "queues must be an array of known queue ids",
}

interface WriteContext {
  errorResponse: NextResponse | null
}

/** The shared demo levers, honored before any write touches the copy. */
async function applyDemoLevers(request: Request): Promise<WriteContext> {
  const { searchParams } = new URL(request.url)

  const delayMs = Math.min(
    Math.max(Number(searchParams.get("delay")) || 0, 0),
    MAX_DELAY_MS
  )
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  const fail = searchParams.get("fail")
  if (fail) {
    const status = Number(fail) >= 400 ? Number(fail) : 500
    return {
      errorResponse: NextResponse.json(
        { error: "Simulated upstream failure" },
        { status }
      ),
    }
  }
  return { errorResponse: null }
}

export async function GET(request: Request) {
  const { errorResponse } = await applyDemoLevers(request)
  if (errorResponse) return errorResponse
  return NextResponse.json(db)
}

/**
 * PATCH { entity: "queue" | "agent", id, patch: { field: value, ... } } —
 * one request per commit (an inline edit is a one-entry patch; the row form
 * batches its changed fields). 400 on any disallowed field or bad value —
 * all-or-nothing, no partial application.
 */
export async function PATCH(request: Request) {
  const { errorResponse } = await applyDemoLevers(request)
  if (errorResponse) return errorResponse

  const body = (await request.json().catch(() => null)) as {
    entity?: string
    id?: string
    patch?: Record<string, unknown>
  } | null
  if (
    !body ||
    (body.entity !== "queue" && body.entity !== "agent") ||
    typeof body.id !== "string" ||
    !body.patch ||
    typeof body.patch !== "object" ||
    Object.keys(body.patch).length === 0
  ) {
    return NextResponse.json(
      { error: "Expected { entity: 'queue'|'agent', id, patch }" },
      { status: 400 }
    )
  }

  const rules = body.entity === "queue" ? QUEUE_FIELDS : AGENT_FIELDS
  for (const [field, value] of Object.entries(body.patch)) {
    const rule = rules[field]
    if (!rule) {
      return NextResponse.json(
        { error: `Field "${field}" is not editable on a ${body.entity}` },
        { status: 400 }
      )
    }
    const problem = rule(value)
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 })
    }
  }

  let found = false
  for (const frame of allFrames()) {
    if (body.entity === "queue") {
      for (const q of frame.queues) {
        if (q.queue_id === body.id) {
          Object.assign(q, body.patch)
          found = true
        }
      }
    } else {
      for (const a of frame.agents) {
        if (a.agent_id === body.id) {
          Object.assign(a, body.patch)
          found = true
        }
      }
    }
    if (found) rederiveFrame(frame)
  }
  if (!found) {
    return NextResponse.json(
      { error: `No ${body.entity} with id "${body.id}"` },
      { status: 404 }
    )
  }
  return NextResponse.json({ ok: true })
}

/**
 * DELETE { entity, ids: string[] } | { entity, all: true } — removal from
 * current and every history frame. Bulk is one request (one undo batch on
 * the client maps to one commit here).
 */
export async function DELETE(request: Request) {
  const { errorResponse } = await applyDemoLevers(request)
  if (errorResponse) return errorResponse

  const body = (await request.json().catch(() => null)) as {
    entity?: string
    ids?: string[]
    all?: boolean
  } | null
  if (
    !body ||
    (body.entity !== "queue" && body.entity !== "agent") ||
    (!body.all &&
      (!Array.isArray(body.ids) ||
        body.ids.length === 0 ||
        !body.ids.every((id) => typeof id === "string")))
  ) {
    return NextResponse.json(
      { error: "Expected { entity: 'queue'|'agent', ids } or { entity, all: true }" },
      { status: 400 }
    )
  }

  const shouldDelete = (id: string) =>
    body.all ? true : body.ids!.includes(id)

  for (const frame of allFrames()) {
    if (body.entity === "queue") {
      frame.queues = frame.queues.filter((q) => !shouldDelete(q.queue_id))
    } else {
      frame.agents = frame.agents.filter((a) => !shouldDelete(a.agent_id))
    }
    rederiveFrame(frame)
  }
  return NextResponse.json({ ok: true })
}
