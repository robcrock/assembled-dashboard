import type * as React from "react"

import { Card } from "@workspace/ui/components/card"
import { ErrorState } from "@workspace/ui/components/error-state"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { StaleIndicator } from "@workspace/ui/components/stale-indicator"
import type { Feed } from "@workspace/ui/lib/feed"
import { cn } from "@workspace/ui/lib/utils"

// Headline number + label. Owns its loading/empty/error/stale rendering so
// consumers just forward the store's feed — the skeleton mirrors the final
// layout (label line, value block) so nothing shifts on resolve. Stale keeps
// the value rendered and dims it; it never blanks.
//
// Two presentations, one content contract:
// - "card"  — a standalone bordered card (the default).
// - "plain" — bare content, for divider-separated KPI rows where the row's
//   container owns the separation (whitespace/dividers beat card chrome for
//   sibling stats in a shared context). Divider convention for plain rows:
//   the CONTAINER owns the rules — first item pr-only, middle items
//   border-l + px, last item border-l + pl (reconfigure per breakpoint).
//
// Two sizes, one anatomy: "default" for dense strips, "lg" for overview-band
// hero counts — the size swaps one metric-ramp step, never structure/states.

const VALUE_SIZE = {
  default: "text-metric-lg",
  lg: "text-metric-xl",
} as const

const SKELETON_SIZE = {
  default: "h-8 w-20",
  lg: "h-10 w-14",
} as const

interface StatCardProps {
  label: string
  /** Headline. ReactNode so consumers can pass `Duration` etc.; nullish under `live` renders a deliberate em dash. */
  value?: React.ReactNode
  /** Slot for a `MetricDelta`, rendered beside the value. */
  delta?: React.ReactNode
  /** Feed condition; defaults to live. Drives loading/empty/error/stale. */
  feed?: Feed
  /** Presentation: standalone bordered card, or bare content for divider rows. */
  variant?: "card" | "plain"
  /** Value type scale: dense-strip default, or lg for overview hero counts. */
  size?: "default" | "lg"
  /** Trend slot (e.g. a `Sparkline`), rendered under the value. */
  children?: React.ReactNode
  className?: string
}

function StatCard({
  label,
  value,
  delta,
  feed = { status: "live" },
  variant = "card",
  size = "default",
  children,
  className,
}: StatCardProps) {
  const { status, lastUpdatedAt = null, onRetry } = feed

  const content = (
    <>
      <div className="text-muted-foreground text-label truncate">
        {label}
      </div>

      {status === "loading" ? (
        <>
          <Skeleton className={SKELETON_SIZE[size]} />
          {/* no extra margin: the container's gap already separates value from
              trend in the live layout, so any margin here IS resolve shift */}
          {children && <Skeleton className="h-5 w-16" />}
        </>
      ) : status === "error" ? (
        <ErrorState
          title="Unavailable"
          onRetry={onRetry}
          className="items-start border-0 px-0 py-1 text-left"
        />
      ) : (
        <>
          <div
            className={cn(
              "flex items-baseline gap-2",
              status === "stale" && "stale-dim",
            )}
          >
            <div className={cn("text-foreground", VALUE_SIZE[size])}>
              {value ?? <span className="text-muted-foreground">—</span>}
            </div>
            {delta}
          </div>
          {children && (
            <div className={cn(status === "stale" && "stale-dim")}>
              {children}
            </div>
          )}
          {status === "stale" && (
            <StaleIndicator lastUpdatedAt={lastUpdatedAt} tone="stale" />
          )}
        </>
      )}
    </>
  )

  if (variant === "plain") {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)}>
        {content}
      </div>
    )
  }

  return (
    <Card size="sm" className={cn("min-w-32 gap-1 px-3", className)}>
      {content}
    </Card>
  )
}

export { StatCard }
