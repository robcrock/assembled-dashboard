"use client"

// The live-data store — the ONLY place that knows how dashboard data is
// managed. Components receive { data, status } as props and never fetch.
//
// Mechanics:
// - Fetches GET /api/dashboard once, forwarding the page's ?fail/?delay params
//   so the route handler's failure toggles are demoable with zero extra UI
//   (visit /?fail=1 or /?delay=4000).
// - Replays the fixture's history[] frames on a compressed timer (default one
//   tick per 3s vs. the real 300s cadence) up to `current`, so sparklines and
//   deltas visibly move during a walkthrough. The fixture's last history frame
//   IS `current`; a guard appends `current` only if that ever changes.
// - When the fixture is exhausted, ticks STOP: freshness freezes at the last
//   real arrival and the watchdog degrades the feed to `stale` — the honest
//   reading of a feed that stopped ticking (feed-states doctrine: degrade
//   rather than lie about liveness). Reload restarts the replay. Pass
//   `paused: true` for the same degradation on demand mid-replay — the
//   late-data demo.
// - Staleness is ARRIVAL-time based (when did the last tick land), not
//   tick-timestamp based — replayed fixture timestamps are in the past, so
//   comparing them against the wall clock would read permanently stale.
// - Plain hook state, no external store or context: the page has exactly one
//   client boundary consuming this; machinery for sharing would be unearned.
//
// THE WRITE SIDE (ROB-93). Mutations are optimistic over a sticky OVERLAY
// (dashboard-overlay.ts), applied to whatever frame the replay serves — an
// edit baked into one frame would vanish on the next tick, so the overlay IS
// the durable local truth and display recomputes `applyOverlay(frames[i])`
// every render. Two write grammars:
// - EDITS commit eagerly: overlay first, PATCH in flight; a failed request
//   reverts the overlay entry and raises the error toast — the page never
//   shows a value the server refused for longer than the round trip.
// - DELETES commit lazily (deferred-commit): rows vanish into the overlay
//   immediately, but the server DELETE fires only when the undo toast
//   EXPIRES — Undo just drops the overlay entry and no request ever exists
//   (there is no re-create endpoint to need). A newer delete batch commits
//   the pending one on arrival, so at most one batch is ever undoable.
// The store owns the toast STATE (mutation lifecycle and undo timers are its
// concern); rendering it is the template's.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { Agent } from "@/features/agent-adherence/model/agent"
import type { Queue } from "@/features/queue-health/model/queue"
import type { DashboardFrame, DashboardPayload } from "@/hooks/dashboard-frame"
import {
  applyOverlay,
  EMPTY_OVERLAY,
  type DashboardOverlay,
} from "@/hooks/dashboard-overlay"
import type { Feed, FeedStatus } from "@workspace/ui/lib/feed"

export interface UseDashboardDataOptions {
  /** Compressed replay cadence in ms (real cadence is meta.tick_interval_sec). */
  tickMs?: number
  /** How late a tick may be before status degrades to stale. Default 2.5 × tickMs. */
  staleAfterMs?: number
  /** Stops replay ticks from arriving — the "late data" demo. Data stays rendered. */
  paused?: boolean
  /**
   * Makes the next fetch hit the route handler's failure path (?fail=1) — the
   * inject-error demo control. While true, retry re-fails; flipping it off
   * refetches and recovers.
   */
  fail?: boolean
}

/** Mutation intents the tables emit — the store is the only place that knows they become HTTP. */
export interface DashboardMutators {
  patchQueue: (id: string, patch: Record<string, unknown>) => void
  patchAgent: (id: string, patch: Record<string, unknown>) => void
  deleteQueues: (ids: string[]) => void
  deleteAgents: (ids: string[]) => void
}

/** The one transient notice; the template renders it with the `Toast` primitive verbatim. */
export interface StoreToast {
  /** Changes per notice — the render key, so a superseding toast restarts the lifetime. */
  key: number
  tone: "undo" | "error"
  message: string
  actionLabel?: string
  /** ms until onExpire — undo windows run longer than error notices (the expiry COMMITS a delete). */
  duration: number
  onAction?: () => void
  onExpire: () => void
}

export interface UseDashboardDataResult {
  data: DashboardFrame | null
  /**
   * The tenant operating this dashboard (`meta.org` from the feed) — the UI
   * is whitelabel, so the operating company's identity always arrives as
   * data, never as hardcoded branding. Null until the first payload lands.
   */
  org: string | null
  /** Feed condition + how to recover, threaded to every section as one value. */
  feed: Feed
  /** The write side — optimistic, overlay-backed, rollback on failure. */
  mutate: DashboardMutators
  /** Current transient notice (undo countdown / rollback alert), or null. */
  toast: StoreToast | null
}

/** Forward only the route handler's demo params, never arbitrary query noise. */
function demoParams(search: string, forceFail: boolean): string {
  const src = new URLSearchParams(search)
  const out = new URLSearchParams()
  for (const key of ["fail", "delay"]) {
    const value = src.get(key)
    if (value) out.set(key, value)
  }
  if (forceFail) out.set("fail", "1")
  const qs = out.toString()
  return qs ? `?${qs}` : ""
}

function framesOf(payload: DashboardPayload): DashboardFrame[] {
  const history = payload.history
  const last = history[history.length - 1]
  return last && last.ts === payload.current.ts
    ? history
    : [...history, payload.current]
}

export function useDashboardData(
  options: UseDashboardDataOptions = {}
): UseDashboardDataResult {
  const { tickMs = 3000, paused = false, fail = false } = options
  const staleAfterMs = options.staleAfterMs ?? tickMs * 2.5

  const [payload, setPayload] = useState<DashboardPayload | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Write side. `fail` rides a ref so mutators stay stable while the
  // inject-error lever still bites the NEXT write.
  const [overlay, setOverlay] = useState<DashboardOverlay>(EMPTY_OVERLAY)
  const [toast, setToast] = useState<StoreToast | null>(null)
  const failRef = useRef(fail)
  useEffect(() => {
    failRef.current = fail
  }, [fail])
  const toastKeyRef = useRef(0)
  const pendingDeleteRef = useRef<{
    entity: "queue" | "agent"
    ids: string[]
  } | null>(null)

  // Initial fetch (re-run by retry()).
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError(null)
      try {
        const res = await fetch(
          `/api/dashboard${demoParams(window.location.search, fail)}`,
          { signal: controller.signal, cache: "no-store" }
        )
        if (!res.ok) throw new Error(`Dashboard API responded ${res.status}`)
        const body = (await res.json()) as DashboardPayload
        setPayload(body)
        setFrameIndex(0)
        setLastUpdatedAt(Date.now())
        setStale(false)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        )
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, fail])

  // Replay ticks — one timeout per frame advance, re-armed by the frameIndex
  // dep. Deliberately NOT a perpetual interval: past the terminal frame the
  // effect schedules nothing, so `lastUpdatedAt` freezes and the watchdog
  // below flips the feed to stale — no heartbeat re-stamping "live · 0s ago"
  // over a frame that stopped changing.
  useEffect(() => {
    if (!payload || paused) return
    const frameCount = framesOf(payload).length
    if (frameIndex >= frameCount - 1) return // exhausted — age honestly
    const id = setTimeout(() => {
      setFrameIndex((i) => Math.min(i + 1, frameCount - 1))
      setLastUpdatedAt(Date.now())
      setStale(false)
    }, tickMs)
    return () => clearTimeout(id)
  }, [payload, paused, tickMs, frameIndex])

  // Freshness watchdog — checks arrival age every second.
  useEffect(() => {
    if (lastUpdatedAt === null) return
    const id = setInterval(() => {
      setStale(Date.now() - lastUpdatedAt > staleAfterMs)
    }, 1000)
    return () => clearInterval(id)
  }, [lastUpdatedAt, staleAfterMs])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  /* ---- write side --------------------------------------------------------- */

  const writeUrl = useCallback(
    () => `/api/dashboard${demoParams(window.location.search, failRef.current)}`,
    []
  )

  const raiseErrorToast = useCallback((message: string) => {
    const key = ++toastKeyRef.current
    setToast({
      key,
      tone: "error",
      message,
      duration: 6000,
      // Expiry of an error notice is just dismissal — but only its own;
      // a newer toast may have superseded this one by then.
      onExpire: () =>
        setToast((t) => (t?.key === key ? null : t)),
    })
  }, [])

  /** Fire the pending delete batch's real request. Undo is no longer possible past this point. */
  const commitPendingDelete = useCallback(() => {
    const pending = pendingDeleteRef.current
    if (!pending) return
    pendingDeleteRef.current = null
    void fetch(writeUrl(), {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity: pending.entity, ids: pending.ids }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`DELETE responded ${res.status}`)
      })
      .catch(() => {
        // The commit failed — the rows still exist server-side, so the
        // overlay stops claiming otherwise and the failure announces itself.
        setOverlay((prev) => restoreDeleted(prev, pending.entity, pending.ids))
        raiseErrorToast("Couldn't delete — rows restored.")
      })
  }, [writeUrl, raiseErrorToast])

  const patchEntity = useCallback(
    (entity: "queue" | "agent", id: string, patch: Record<string, unknown>) => {
      // Optimistic: overlay first, capturing what this entity's entry looked
      // like before, so a refused write reverts EXACTLY that much.
      let previous: Partial<Queue> | Partial<Agent> | undefined
      setOverlay((prev) => {
        const map = entity === "queue" ? prev.queuePatches : prev.agentPatches
        previous = map.get(id)
        return withPatch(prev, entity, id, { ...previous, ...patch })
      })
      void fetch(writeUrl(), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity, id, patch }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`PATCH responded ${res.status}`)
        })
        .catch(() => {
          setOverlay((prev) => withPatch(prev, entity, id, previous))
          raiseErrorToast("Couldn't save — your change was reverted.")
        })
    },
    [writeUrl, raiseErrorToast]
  )

  const deleteEntities = useCallback(
    (entity: "queue" | "agent", ids: string[]) => {
      if (ids.length === 0) return
      // At most one undoable batch: a newer delete commits the pending one.
      commitPendingDelete()
      setOverlay((prev) => markDeleted(prev, entity, ids))
      pendingDeleteRef.current = { entity, ids }
      const key = ++toastKeyRef.current
      setToast({
        key,
        tone: "undo",
        message: `${ids.length} ${ids.length === 1 ? "row" : "rows"} removed`,
        actionLabel: "Undo",
        // The expiry COMMITS the delete — give a human time to change their
        // mind (5s reads as "gone before I finished parsing the message").
        duration: 8000,
        onAction: () => {
          // Undo = the request never happens; the overlay stops hiding them.
          pendingDeleteRef.current = null
          setOverlay((prev) => restoreDeleted(prev, entity, ids))
          setToast((t) => (t?.key === key ? null : t))
        },
        onExpire: () => {
          commitPendingDelete()
          setToast((t) => (t?.key === key ? null : t))
        },
      })
    },
    [commitPendingDelete]
  )

  const mutate = useMemo<DashboardMutators>(
    () => ({
      patchQueue: (id, patch) => patchEntity("queue", id, patch),
      patchAgent: (id, patch) => patchEntity("agent", id, patch),
      deleteQueues: (ids) => deleteEntities("queue", ids),
      deleteAgents: (ids) => deleteEntities("agent", ids),
    }),
    [patchEntity, deleteEntities]
  )

  /* ---- read side ---------------------------------------------------------- */

  const frames = payload ? framesOf(payload) : null
  const frame = frames
    ? (frames[Math.min(frameIndex, frames.length - 1)] ?? null)
    : null
  // The overlay applies to WHATEVER frame the replay serves — this recompute
  // per render is what makes edits sticky across ticks.
  const data = frame ? applyOverlay(frame, overlay) : null

  const status: FeedStatus = error
    ? "error"
    : !data
      ? "loading"
      : stale
        ? "stale"
        : "live"

  const feed = useMemo<Feed>(
    () => ({ status, lastUpdatedAt, onRetry: retry }),
    [status, lastUpdatedAt, retry]
  )

  return { data, org: payload?.meta.org ?? null, feed, mutate, toast }
}

/* ---- overlay updaters ------------------------------------------------------
 * Pure Map/Set copy-on-write helpers; entity discrimination stays here so the
 * mutator callbacks above read as intent.
 * -------------------------------------------------------------------------- */

function withPatch(
  prev: DashboardOverlay,
  entity: "queue" | "agent",
  id: string,
  entry: Partial<Queue> | Partial<Agent> | undefined
): DashboardOverlay {
  if (entity === "queue") {
    const queuePatches = new Map(prev.queuePatches)
    if (entry === undefined) queuePatches.delete(id)
    else queuePatches.set(id, entry as Partial<Queue>)
    return { ...prev, queuePatches }
  }
  const agentPatches = new Map(prev.agentPatches)
  if (entry === undefined) agentPatches.delete(id)
  else agentPatches.set(id, entry as Partial<Agent>)
  return { ...prev, agentPatches }
}

function markDeleted(
  prev: DashboardOverlay,
  entity: "queue" | "agent",
  ids: string[]
): DashboardOverlay {
  if (entity === "queue") {
    const deletedQueues = new Set(prev.deletedQueues)
    for (const id of ids) deletedQueues.add(id)
    return { ...prev, deletedQueues }
  }
  const deletedAgents = new Set(prev.deletedAgents)
  for (const id of ids) deletedAgents.add(id)
  return { ...prev, deletedAgents }
}

function restoreDeleted(
  prev: DashboardOverlay,
  entity: "queue" | "agent",
  ids: string[]
): DashboardOverlay {
  if (entity === "queue") {
    const deletedQueues = new Set(prev.deletedQueues)
    for (const id of ids) deletedQueues.delete(id)
    return { ...prev, deletedQueues }
  }
  const deletedAgents = new Set(prev.deletedAgents)
  for (const id of ids) deletedAgents.delete(id)
  return { ...prev, deletedAgents }
}
