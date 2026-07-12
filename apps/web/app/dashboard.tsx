"use client"

// The single client boundary. Owns useDashboardData() and passes
// { data, feed } down — no section fetches on its own. The header lives here
// too: this UI is whitelabel, so the operating company's identity (org) comes
// from the feed and can only render inside the data boundary.
//
// Page hierarchy, top to bottom, is the eye's travel: identity + freshness
// chrome → the overview row (SLA-attainment gauge + the two alarm counts) →
// queues by trouble → missing capacity. The overview is deliberately three
// numbers, not a strip of mixed KPIs: attainment is the org-level promise,
// and each alarm count previews the section that explains it.
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
import { Skeleton } from "@workspace/ui/components/skeleton"
import { StaleIndicator } from "@workspace/ui/components/stale-indicator"
import { ThemeToggle } from "@workspace/ui/components/theme-toggle"
import type { Feed } from "@workspace/ui/lib/feed"
import { cn } from "@workspace/ui/lib/utils"

import { AgentAdherenceTable } from "@/features/agent-adherence/components/agent-adherence-table"
import { QueueHealthTable } from "@/features/queue-health/components/queue-health-table"
import { AttainmentOverview } from "@/features/summary/components/attainment-overview"
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

/**
 * Whitelabel identity: the tenant's name and a monogram tile, both derived
 * from feed data — no hardcoded branding anywhere. Skeletons mirror the
 * final layout until the first payload lands.
 */
function OrgIdentity({ org }: { org: string | null }) {
  return (
    <a href="/" aria-label="Homepage" className="flex min-w-0 items-center gap-3">
      {org ? (
        <div
          aria-hidden
          className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold"
        >
          {org.charAt(0)}
        </div>
      ) : (
        <Skeleton className="size-9 shrink-0 rounded-md" />
      )}
      <div className="min-w-0">
        {org ? (
          <h1 className="truncate text-base font-semibold">{org}</h1>
        ) : (
          <Skeleton className="h-4 w-36" />
        )}
        <p className="text-muted-foreground truncate text-sm">
          Floor status — real-time operations.
        </p>
      </div>
    </a>
  )
}

/**
 * A section-level alarm number for the overview row — breach ink when
 * non-zero, calm otherwise. Fed plain numbers by the composition root so the
 * summary slice never leaks into the section slices.
 */
function AlarmStat({
  label,
  count,
  detail,
  feed = { status: "live" },
}: {
  label: string
  count?: number
  detail?: string
  feed?: Feed
}) {
  if (feed.status === "loading") {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="text-muted-foreground truncate text-xs font-medium">
          {label}
        </div>
        <Skeleton className="h-10 w-14" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        feed.status === "stale" && "opacity-60",
      )}
    >
      <div className="text-muted-foreground truncate text-xs font-medium">
        {label}
      </div>
      <div
        className={cn(
          "text-4xl font-medium tabular-nums",
          count !== undefined && count > 0
            ? "text-sla-breach"
            : "text-foreground",
        )}
      >
        {count ?? <span className="text-muted-foreground">—</span>}
      </div>
      {detail && (
        <div className="text-muted-foreground text-metric-sm">{detail}</div>
      )}
    </div>
  )
}

export function Dashboard() {
  const [paused, setPaused] = useState(false)
  const [injectError, setInjectError] = useState(false)
  const { data, org, feed } = useDashboardData({ paused, fail: injectError })

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

  const summary = data?.summary ?? null

  return (
    <div className="isolate min-h-svh">
      {/* Chrome: identity left, freshness + demo controls + theme right.
          Inner container matches <main> so content edges align. */}
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
          <OrgIdentity org={org} />
          <div className="flex flex-wrap items-center justify-end gap-3">
            {paused && (
              <div className="text-muted-foreground text-metric-sm max-lg:hidden">
                replay paused · goes stale when the next tick is late
              </div>
            )}
            <StaleIndicator
              lastUpdatedAt={feed.lastUpdatedAt ?? null}
              tone={feed.status === "stale" ? "stale" : "live"}
            />
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label="Demo controls"
            >
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
            <div aria-hidden className="bg-border h-5 w-px" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-10">
          {/* Overview row: the org-level promise, then the two alarm counts
              that preview the sections beneath. */}
          <section
            aria-label="Floor overview"
            className="flex flex-wrap items-center gap-x-14 gap-y-6"
          >
            <AttainmentOverview
              summary={summary}
              ts={data?.ts ?? null}
              feed={feed}
            />
            <AlarmStat
              label="Queues breaching"
              count={summary?.queues_breaching}
              detail={
                summary
                  ? `${summary.queues_at_risk} at risk · ${summary.tickets_waiting_total} waiting`
                  : undefined
              }
              feed={feed}
            />
            <AlarmStat
              label="Out of adherence"
              count={summary?.agents_out_of_adherence}
              detail={summary ? `of ${summary.agents_online} online` : undefined}
              feed={feed}
            />
          </section>

          <section aria-labelledby="queues-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="queues-heading" className="text-base font-semibold">
                Queues
              </h2>
              <p className="text-muted-foreground text-sm">
                Sorted by severity against each queue&apos;s own target — expand
                a row to see who can help.
              </p>
            </div>
            <QueueHealthTable
              queues={data?.queues ?? []}
              agents={data?.agents ?? []}
              feed={feed}
            />
          </section>

          <section aria-labelledby="agents-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="agents-heading" className="text-base font-semibold">
                Agents needing attention
              </h2>
              <p className="text-muted-foreground text-sm">
                Out of adherence, longest out first, with the queues they cover.
              </p>
            </div>
            <AgentAdherenceTable
              agents={data?.agents ?? []}
              feed={feed}
              queueNamesById={queueNamesById}
            />
          </section>
        </div>
      </main>
    </div>
  )
}
