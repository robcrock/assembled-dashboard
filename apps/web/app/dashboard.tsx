"use client"

// The single client boundary. Owns useDashboardData() and passes
// { data, status } down — no section fetches on its own. Everything below is
// the eye's travel: summary strip → queues by trouble → missing capacity.
//
// Demo levers (the failure story, demonstrable without extra chrome):
//   /?fail=1      → error state with retry (route returns 500)
//   /?delay=4000  → loading skeletons for 4s (route injects latency)
//   press "p"     → pause replay; ~8s later ticks are "late" and the page
//                   degrades to stale (mirrors the "d" theme hotkey)

import { useEffect, useMemo, useState } from "react"

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
  const { data, feed } = useDashboardData({ paused })

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
      <div className="flex items-center justify-end gap-3">
        {paused && (
          <span className="text-muted-foreground text-metric-sm">
            replay paused · press p to resume
          </span>
        )}
        <StaleIndicator
          lastUpdatedAt={feed.lastUpdatedAt ?? null}
          tone={feed.status === "stale" ? "stale" : "live"}
        />
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
        <QueueHealthTable queues={data?.queues ?? []} feed={feed} />
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
