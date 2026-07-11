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
// - After the last frame it holds there, re-marking arrival each tick (a
//   heartbeat) — the dashboard stays live rather than decaying to stale at the
//   end of every demo. Pass `paused: true` to stop ticks arriving: freshness
//   then degrades to `stale`, which is exactly the late-data demo.
// - Staleness is ARRIVAL-time based (when did the last tick land), not
//   tick-timestamp based — replayed fixture timestamps are in the past, so
//   comparing them against the wall clock would read permanently stale.
// - Plain hook state, no external store or context: the page has exactly one
//   client boundary consuming this; machinery for sharing would be unearned.

import { useCallback, useEffect, useMemo, useState } from "react"

import type { DashboardFrame, DashboardPayload } from "@/hooks/dashboard-frame"
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
  options: UseDashboardDataOptions = {},
): UseDashboardDataResult {
  const { tickMs = 3000, paused = false, fail = false } = options
  const staleAfterMs = options.staleAfterMs ?? tickMs * 2.5

  const [payload, setPayload] = useState<DashboardPayload | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Initial fetch (re-run by retry()).
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError(null)
      try {
        const res = await fetch(
          `/api/dashboard${demoParams(window.location.search, fail)}`,
          { signal: controller.signal, cache: "no-store" },
        )
        if (!res.ok) throw new Error(`Dashboard API responded ${res.status}`)
        const body = (await res.json()) as DashboardPayload
        setPayload(body)
        setFrameIndex(0)
        setLastUpdatedAt(Date.now())
        setStale(false)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, fail])

  // Replay ticks. At the end of history this keeps firing as a heartbeat:
  // the frame stops advancing but arrival keeps refreshing (still live).
  useEffect(() => {
    if (!payload || paused) return
    const frameCount = framesOf(payload).length
    const id = setInterval(() => {
      setFrameIndex((i) => Math.min(i + 1, frameCount - 1))
      setLastUpdatedAt(Date.now())
      setStale(false)
    }, tickMs)
    return () => clearInterval(id)
  }, [payload, paused, tickMs])

  // Freshness watchdog — checks arrival age every second.
  useEffect(() => {
    if (lastUpdatedAt === null) return
    const id = setInterval(() => {
      setStale(Date.now() - lastUpdatedAt > staleAfterMs)
    }, 1000)
    return () => clearInterval(id)
  }, [lastUpdatedAt, staleAfterMs])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const frames = payload ? framesOf(payload) : null
  const data = frames
    ? (frames[Math.min(frameIndex, frames.length - 1)] ?? null)
    : null

  const status: FeedStatus = error
    ? "error"
    : !data
      ? "loading"
      : stale
        ? "stale"
        : "live"

  const feed = useMemo<Feed>(
    () => ({ status, lastUpdatedAt, onRetry: retry }),
    [status, lastUpdatedAt, retry],
  )

  return { data, org: payload?.meta.org ?? null, feed }
}
