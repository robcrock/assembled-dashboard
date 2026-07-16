"use client"

import * as React from "react"
import { CircleAlert } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

// One transient notice with a lifetime — the surface for "you can still
// undo this" (a successful destructive action counting down to commit) and
// "that write failed, we put it back" (an optimistic rollback). ONE toast
// at a time is the deliberate design, not a missing feature: the consumers
// are a handful of table intents, and a newer intent superseding the notice
// is the honest semantic (the store commits the prior batch when a new one
// arrives) — so there is no stacking, no queue, no portal manager, and no
// sonner dependency for three props' worth of behavior.
//
// The DURATION belongs to the toast (it renders the lifetime; hovering or
// focusing it parks the timer — you cannot read the undo away), but the
// CONSEQUENCE belongs to the consumer: onExpire is where a deferred delete
// actually commits, onAction is where it un-happens. The component decides
// nothing about what expiry means.
//
// Two tones, two liveness registers: "undo" renders as a quiet popover-ink
// status (role=status, polite — an offer, not an alarm); "error" carries the
// destructive ring + breach-ink icon and announces assertively (role=alert)
// — a failed write is a broken promise, and it speaks in that color.
//
// PLACEMENT IS THE CONSUMER'S, deliberately (the PageSection "no margins
// baked in" discipline): a `position: fixed` baked into a primitive silently
// lies inside any transformed/filtered ancestor (fixed resolves against the
// transform's containing block, not the viewport — a Storybook decorator was
// enough to reproduce it). The component is the card; the page pins it.

interface ToastProps {
  message: string
  /** "undo": quiet status + optional action. "error": alert + destructive ring. */
  tone?: "undo" | "error"
  /** Renders the action button ("Undo"); omit for a dismiss-only notice. */
  actionLabel?: string
  onAction?: () => void
  /** ms until onExpire. Hover/focus parks the timer; leaving restarts it in full. */
  duration?: number
  /** The lifetime's consequence — commit the deferred delete, or just dismiss. */
  onExpire?: () => void
  className?: string
}

function Toast({
  message,
  tone = "undo",
  actionLabel,
  onAction,
  duration = 5000,
  onExpire,
  className,
}: ToastProps) {
  const [parked, setParked] = React.useState(false)

  // The lifetime. Parking clears the timeout; unparking re-arms it in full —
  // a reader who hovered gets the whole window back, which errs on the side
  // of "the undo stays reachable" over precise bookkeeping.
  React.useEffect(() => {
    if (parked || !onExpire) return
    const id = setTimeout(onExpire, duration)
    return () => clearTimeout(id)
  }, [parked, duration, onExpire])

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      onPointerEnter={() => setParked(true)}
      onPointerLeave={() => setParked(false)}
      onFocus={() => setParked(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setParked(false)
        }
      }}
      className={cn(
        "flex max-w-sm items-center gap-3 rounded-lg bg-popover px-4 py-3 text-sm text-popover-foreground shadow-md ring-1",
        tone === "error" ? "ring-destructive/40" : "ring-foreground/10",
        className
      )}
    >
      {tone === "error" && (
        <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
      )}
      <span className="min-w-0 flex-1">{message}</span>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export { Toast }
