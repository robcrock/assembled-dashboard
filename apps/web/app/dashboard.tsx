"use client"

// The single client boundary. Owns useDashboardData() and passes
// { data, status } down — no section fetches on its own. Everything below is
// the eye's travel: summary strip → queues by trouble → missing capacity.
//
// Demo levers (the failure story, demonstrable from the toolbar or by hand):
//   Pause button / "p" → pause replay; ~8s later ticks are "late" and the
//                        page degrades to stale
//   Error button       → refetch hits ?fail=1 (route returns 500) → every
//                        section shows ErrorState with retry; toggle off to
//                        recover
//   /?fail=1, /?delay=4000 → same failure paths, URL-driven

import { useEffect, useMemo, useState } from "react"
import { CircleAlert, Pause, Play } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { StaleIndicator } from "@workspace/ui/components/stale-indicator"

import { AgentAdherenceTable } from "@/features/agent-adherence/components/agent-adherence-table"
import { QueueHealthTable } from "@/features/queue-health/components/queue-health-table"
import { SummaryBar } from "@/features/summary/components/summary-bar"
import { useDashboardData } from "@/hooks/use-dashboard-data"

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function Dashboard() {
  const [paused, setPaused] = useState(false)
  const [injectError, setInjectError] = useState(false)
  const { data, feed } = useDashboardData({ paused, fail: injectError })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== "p") return
      if (isTypingTarget(event.target)) return
      setPaused((p) => !p)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const queueNamesById = useMemo(
    () =>
      Object.fromEntries(
        (data?.queues ?? []).map((q) => [q.queue_id, q.name]),
      ),
    [data],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {paused && (
          <span className="text-muted-foreground text-metric-sm">
            replay paused · goes stale when the next tick is late
          </span>
        )}
        <StaleIndicator
          lastUpdatedAt={feed.lastUpdatedAt ?? null}
          tone={feed.status === "stale" ? "stale" : "live"}
        />
        <div className="flex items-center gap-2" role="group" aria-label="Demo controls">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
          >
            {paused ? (
              <Play aria-hidden className="size-3.5" />
            ) : (
              <Pause aria-hidden className="size-3.5" />
            )}
            {paused ? "Resume replay" : "Pause replay"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInjectError((e) => !e)}
            aria-pressed={injectError}
          >
            <CircleAlert aria-hidden className="size-3.5" />
            {injectError ? "Clear error" : "Inject error"}
          </Button>
        </div>
      </div>

      <SummaryBar
        summary={data?.summary ?? null}
        ts={data?.ts ?? null}
        feed={feed}
      />

      <section aria-labelledby="queues-heading" className="flex flex-col gap-2">
        <h2 id="queues-heading" className="text-sm font-medium">
          Queues
        </h2>
        <QueueHealthTable
          queues={data?.queues ?? []}
          agents={data?.agents ?? []}
          feed={feed}
        />
      </section>

      <section aria-labelledby="agents-heading" className="flex flex-col gap-2">
        <h2 id="agents-heading" className="text-sm font-medium">
          Agents needing attention
        </h2>
        <AgentAdherenceTable
          agents={data?.agents ?? []}
          feed={feed}
          queueNamesById={queueNamesById}
        />
      </section>
    </div>
  )
}
