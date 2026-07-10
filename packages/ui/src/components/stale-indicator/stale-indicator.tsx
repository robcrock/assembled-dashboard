"use client"

import { useEffect, useState } from "react"

import { formatDurationSec } from "@workspace/ui/lib/duration"
import { cn } from "@workspace/ui/lib/utils"

// "Updated Xs ago" — the honesty surface. Ticks its own relative time every
// second (the single duration implementation lives in @workspace/ui/lib).
// `tone` is driven by the data store's status: stale degrades to the at-risk
// ink and gains a "Stale" prefix rather than pretending to be live.

interface StaleIndicatorProps {
  /** Wall-clock ms when the last tick arrived; null renders an em dash. */
  lastUpdatedAt: number | null
  tone?: "live" | "stale"
  className?: string
}

function useSecondsSince(sinceMs: number | null): number | null {
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (sinceMs === null) {
      setSeconds(null)
      return
    }
    const update = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - sinceMs) / 1000)))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [sinceMs])

  return seconds
}

function StaleIndicator({
  lastUpdatedAt,
  tone = "live",
  className,
}: StaleIndicatorProps) {
  const seconds = useSecondsSince(lastUpdatedAt)

  return (
    <span
      className={cn(
        "text-metric-sm inline-flex items-center gap-1",
        tone === "stale" ? "text-status-at-risk" : "text-muted-foreground",
        className,
      )}
    >
      {tone === "stale" && <span className="font-medium">Stale ·</span>}
      {seconds === null ? "Updated —" : `Updated ${formatDurationSec(seconds)} ago`}
    </span>
  )
}

export { StaleIndicator }
