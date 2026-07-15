"use client"

// The TEMPLATE in the atomic mapping — and the single client boundary. Owns
// useDashboardData() plus the page-level UI state (paused, injectError),
// arranges the organisms, and passes { data-slice, feed } down — no section
// fetches on its own. There is no separate header bar: the whitelabel
// identity (OrgIdentity, fed meta.org) anchors the overview band at the left
// with the demo chrome beneath it, and the three floor numbers sit right —
// the SLA-attainment tile plus two alarm counts (all StatCard size="lg";
// breach ink supplied by the template because the ink decision is app
// semantics). Attainment is the org-level promise; each alarm count previews
// the section beneath that explains it.
//
// Page hierarchy, top to bottom, is the eye's travel: who + how healthy →
// queues by trouble → missing capacity.
//
// Theming defaults to LIGHT (next-themes defaultTheme="light" — the Braun
// ramp is authored light-first) — the dashboard deliberately mounts no theme
// toggle; dark stays reachable via the "d" hotkey, and the ThemeToggle
// primitive stays in the Storybook catalog.
//
// Demo levers (the failure story, demonstrable from the chrome row or by hand):
//   Pause button / "p" → pause replay; ~8s later ticks are "late" and the
//                        page degrades to stale
//   Error button       → refetch hits ?fail=1 (route returns 500) → every
//                        section shows ErrorState with retry; toggle off to
//                        recover
//   /?fail=1, /?delay=4000 → same failure paths, URL-driven
//   (no lever needed)  → the replay exhausts ~30s in and the feed decays to
//                        stale on its own — an exhausted feed ages honestly;
//                        reload restarts the replay

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { CircleAlert, Pause, Play } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { OrgIdentity } from "@workspace/ui/components/org-identity"
import { PageSection } from "@workspace/ui/components/page-section"
import { StaleIndicator } from "@workspace/ui/components/stale-indicator"
import { StatCard } from "@workspace/ui/components/stat-card"
import { Toast } from "@workspace/ui/components/toast"
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
 * Alarm ink for the overview counts: breach red only when the count is
 * non-zero — this is APP semantics (what counts as an alarm), so it lives in
 * the template, not in StatCard.
 */
function alarmValue(count: number | undefined): ReactNode {
  if (count === undefined) return undefined
  return count > 0 ? <span className="text-sla-breach">{count}</span> : count
}

/**
 * Both faces of a toggle's label, stacked in one grid cell: the button is
 * always as wide as its wider label, so flipping a lever can't resize it and
 * nudge its siblings. `invisible` keeps the inactive face out of the
 * accessibility tree while still holding its width.
 */
function ToggleLabel({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean
  activeLabel: string
  inactiveLabel: string
}) {
  return (
    <span className="grid justify-items-center">
      <span className={cn("col-start-1 row-start-1", !active && "invisible")}>
        {activeLabel}
      </span>
      <span className={cn("col-start-1 row-start-1", active && "invisible")}>
        {inactiveLabel}
      </span>
    </span>
  )
}

/**
 * The quiet chrome row: the demo levers + freshness. Secondary to the
 * numbers — small outline buttons, muted ink. Local by design: one consumer,
 * and the lever state belongs to the template.
 *
 * Order is a no-shift decision: the StaleIndicator's text re-renders every
 * second and changes width at digit boundaries (and gains a "Stale ·"
 * prefix), so it sits AFTER the fixed-width levers — its growth lands in the
 * row's open space instead of pushing the buttons around.
 */
function DemoControls({
  paused,
  injectError,
  onTogglePause,
  onToggleError,
  feed,
}: {
  paused: boolean
  injectError: boolean
  onTogglePause: () => void
  onToggleError: () => void
  feed: Feed
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Demo controls"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePause}
          aria-pressed={paused}
        >
          {paused ? (
            <Play aria-hidden className="size-3.5" />
          ) : (
            <Pause aria-hidden className="size-3.5" />
          )}
          <ToggleLabel
            active={paused}
            activeLabel="Resume replay"
            inactiveLabel="Pause replay"
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleError}
          aria-pressed={injectError}
        >
          <CircleAlert aria-hidden className="size-3.5" />
          <ToggleLabel
            active={injectError}
            activeLabel="Clear error"
            inactiveLabel="Inject error"
          />
        </Button>
      </div>
      {paused && (
        <div className="text-metric-sm text-muted-foreground max-lg:hidden">
          replay paused · goes stale when the next tick is late
        </div>
      )}
      <StaleIndicator
        lastUpdatedAt={feed.lastUpdatedAt ?? null}
        tone={feed.status === "stale" ? "stale" : "live"}
      />
    </div>
  )
}

export function Dashboard() {
  const [paused, setPaused] = useState(false)
  const [injectError, setInjectError] = useState(false)
  const { data, org, feed, toast } = useDashboardData({
    paused,
    fail: injectError,
  })

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
      Object.fromEntries((data?.queues ?? []).map((q) => [q.queue_id, q.name])),
    [data]
  )

  const summary = data?.summary ?? null

  return (
    <div className="isolate min-h-svh">
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-10">
          {/* Overview band — identity anchors the left (chrome row beneath),
              the three floor numbers sit right as divider-separated siblings.
              Container queries drive the collapse; dividers reconfigure per
              column change. */}
          <section aria-label="Floor overview" className="@container">
            <div className="flex flex-col gap-8 @4xl:flex-row @4xl:items-center @4xl:gap-10">
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <OrgIdentity
                  name={org}
                  tagline="Floor status — real-time operations."
                />
                <DemoControls
                  paused={paused}
                  injectError={injectError}
                  onTogglePause={() => setPaused((p) => !p)}
                  onToggleError={() => setInjectError((e) => !e)}
                  feed={feed}
                />
              </div>

              {/* ONE freshness surface: the chrome row's StaleIndicator above
                  is the page's only stale note — every tile and table passes
                  staleNote={false} and speaks stale through its dim alone
                  (less, but better: five identical notes said nothing five
                  times). */}
              {/* KPI trio: the attainment tile, then the two alarm counts —
                  three siblings with one StatCard rhythm. TOP-aligned (picker
                  round, ROB-72): every tile's label/number/sub-line rows share
                  exact baselines, and the attainment tile's meter hangs below
                  as the fourth row it alone carries — items-center would let
                  that extra row push its text off the shared lines. Narrow:
                  attainment on its own row, alarm tiles 2-up with one divider.
                  @xl: one row of three with vertical dividers (first pr-only,
                  middle px, last pl-only). */}
              <div className="grid grid-cols-2 gap-y-6 @xl:flex @xl:items-start">
                <div className="col-span-2 @xl:col-auto @xl:pr-10">
                  <AttainmentOverview
                    summary={summary}
                    ts={data?.ts ?? null}
                    feed={feed}
                  />
                </div>
                <div className="pr-6 @xl:border-l @xl:px-10">
                  <StatCard
                    variant="plain"
                    size="lg"
                    feed={feed}
                    staleNote={false}
                    label="Queues breaching"
                    value={alarmValue(summary?.queues_breaching)}
                  >
                    {summary && (
                      <div className="text-metric-sm text-muted-foreground">
                        {summary.queues_at_risk} at risk ·{" "}
                        {summary.tickets_waiting_total} waiting
                      </div>
                    )}
                  </StatCard>
                </div>
                <div className="border-l pl-6 @xl:pl-10">
                  <StatCard
                    variant="plain"
                    size="lg"
                    feed={feed}
                    staleNote={false}
                    label="Out of adherence"
                    value={alarmValue(summary?.agents_out_of_adherence)}
                  >
                    {summary && (
                      <div className="text-metric-sm text-muted-foreground">
                        of {summary.agents_online} online
                      </div>
                    )}
                  </StatCard>
                </div>
              </div>
            </div>
          </section>

          <PageSection
            id="queues"
            title="Queues"
            description="Sorted by severity against each queue's own target — expand a row to see who can help."
          >
            <QueueHealthTable
              queues={data?.queues ?? []}
              agents={data?.agents ?? []}
              feed={feed}
            />
          </PageSection>

          <PageSection
            id="agents"
            title="Agents needing attention"
            description="Out of adherence, longest out first, with the queues they cover."
          >
            <AgentAdherenceTable
              agents={data?.agents ?? []}
              feed={feed}
              queueNamesById={queueNamesById}
            />
          </PageSection>
        </div>
      </main>
      {/* The store's one transient notice (undo countdown / rollback alert).
          key restarts the lifetime when a newer notice supersedes. Placement
          is the page's: the primitive is just the card. */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <Toast
            key={toast.key}
            tone={toast.tone}
            message={toast.message}
            actionLabel={toast.actionLabel}
            onAction={toast.onAction}
            onExpire={toast.onExpire}
          />
        </div>
      )}
    </div>
  )
}
