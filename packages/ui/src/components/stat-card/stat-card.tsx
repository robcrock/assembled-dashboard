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

interface StatCardProps {
  label: string
  /** Headline. ReactNode so consumers can pass <Duration> etc.; nullish under `live` renders a deliberate em dash. */
  value?: React.ReactNode
  /** Slot for a <MetricDelta>, rendered beside the value. */
  delta?: React.ReactNode
  /** Feed condition; defaults to live. Drives loading/empty/error/stale. */
  feed?: Feed
  /** Trend slot (e.g. a <Sparkline>), rendered under the value. */
  children?: React.ReactNode
  className?: string
}

function StatCard({
  label,
  value,
  delta,
  feed = { status: "live" },
  children,
  className,
}: StatCardProps) {
  const { status, lastUpdatedAt = null, onRetry } = feed
  return (
    <Card size="sm" className={cn("min-w-32 gap-1 px-3", className)}>
      <span className="text-muted-foreground text-xs font-medium">{label}</span>

      {status === "loading" ? (
        <>
          <Skeleton className="h-8 w-20" />
          {children && <Skeleton className="mt-1 h-5 w-16" />}
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
              status === "stale" && "opacity-60",
            )}
          >
            <span className="text-metric-lg text-foreground">
              {value ?? <span className="text-muted-foreground">—</span>}
            </span>
            {delta}
          </div>
          {children && (
            <div className={cn(status === "stale" && "opacity-60")}>
              {children}
            </div>
          )}
          {status === "stale" && (
            <StaleIndicator lastUpdatedAt={lastUpdatedAt} tone="stale" />
          )}
        </>
      )}
    </Card>
  )
}

export { StatCard }
