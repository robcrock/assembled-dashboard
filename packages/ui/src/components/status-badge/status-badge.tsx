import type * as React from "react"
import { CircleAlert, CircleCheck, Clock, type LucideIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

// The canonical status surface. One component covers both value scales of the
// domain language (SLA status and adherence) because they share optics by
// design — the token layer aliases adherence onto the status scale, and this
// map is the single place a status value becomes icon + color + label.
//
// Status is conveyed by ICON SHAPE first (check / clock / alert), color
// second: the palette's loud red is reserved for SLA breach alone, so every
// non-breach status must stay legible through its glyph even if its ink
// reads as calm. The icon carries an sr-only label unless explicitly marked
// decorative (i.e. adjacent text already names the status).

export type Status =
  | "healthy"
  | "at_risk"
  | "breached"
  | "adherent"
  | "out_of_adherence"

// The single place a status value becomes icon + label + color classes:
// `ink` (status-colored text/glyph), `badge` (tinted pill), and `fill` (solid
// accent, for meters/bars). Every status surface derives from this one map so
// nothing drifts — StatusBadge, Meter (via statusFillClass), and Sparkline
// (via statusTextClass) all read from here.
const STATUS_META: Record<
  Status,
  { label: string; icon: LucideIcon; ink: string; badge: string; fill: string }
> = {
  healthy: {
    label: "Healthy",
    icon: CircleCheck,
    ink: "text-status-healthy",
    badge: "bg-status-healthy-bg text-status-healthy",
    fill: "bg-status-healthy",
  },
  at_risk: {
    label: "At risk",
    icon: Clock,
    ink: "text-status-at-risk",
    badge: "bg-status-at-risk-bg text-status-at-risk",
    fill: "bg-status-at-risk",
  },
  breached: {
    label: "Breached",
    icon: CircleAlert,
    // the status ALIAS of the reserved accent — each name used for its own
    // meaning (raw --sla-breach is for non-status surfaces like ErrorState)
    ink: "text-status-breached",
    badge: "bg-status-breached-bg text-status-breached",
    fill: "bg-status-breached",
  },
  adherent: {
    label: "Adherent",
    icon: CircleCheck,
    ink: "text-adherence-ok",
    badge: "bg-adherence-ok-bg text-adherence-ok",
    fill: "bg-adherence-ok",
  },
  // An agent off their planned state IS the agent-side breach — the schedule
  // is the promise. Same glyph, same reserved accent as a queue breach, so
  // the alert glyph + accent read identically across both tables. Consumed
  // via the adherence alias (which resolves to --sla-breach in the token
  // layer) so the ubiquitous-language token is the one actually used.
  out_of_adherence: {
    label: "Out of adherence",
    icon: CircleAlert,
    ink: "text-adherence-out",
    badge: "bg-adherence-out-bg text-adherence-out",
    fill: "bg-adherence-out",
  },
}

/** Canonical status → ink text class, for primitives that tint via currentColor (Sparkline). */
function statusTextClass(status: Status): string {
  return STATUS_META[status].ink
}

/** Canonical status → solid fill class, for meters/bars that fill a track. */
function statusFillClass(status: Status): string {
  return STATUS_META[status].fill
}

interface StatusDotProps {
  status: Status
  /** Set when adjacent text already names the status, so AT doesn't hear it twice. */
  decorative?: boolean
  className?: string
}

/**
 * Kept its historical name, but renders the status GLYPH — shape does the
 * talking so color stays free to mean only "breach".
 *
 * The wrapper is exactly one line tall (h-lh) with the icon centered in it:
 * an icon-only inline-flex has no text baseline, so in a baseline-aligned
 * row the icon's BOTTOM would sit on the baseline and read visibly high.
 * Compose it in `items-start` rows beside text and the glyph centers on the
 * neighboring line box by construction.
 */
function StatusDot({ status, decorative = false, className }: StatusDotProps) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex h-lh items-center", className)}>
      <Icon aria-hidden className={cn("size-3.5", meta.ink)} />
      {!decorative && <span className="sr-only">{meta.label}</span>}
    </span>
  )
}

interface StatusBadgeProps {
  status: Status
  /** Extra detail rendered AFTER the canonical label (e.g. "· 55s over") — it never replaces the label, so status always stays textual. */
  children?: React.ReactNode
  className?: string
}

function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  return (
    <Badge
      variant="outline"
      // canonical tint merged LAST: className can adjust layout but can
      // never re-tint a status surface (same seal as StatusDot/SparkBars)
      className={cn("gap-1.5 border-transparent", className, meta.badge)}
    >
      <StatusDot status={status} decorative />
      {meta.label}
      {children}
    </Badge>
  )
}

export { StatusBadge, StatusDot, statusTextClass, statusFillClass }
