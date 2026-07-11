import type * as React from "react"
import {
  CircleAlert,
  CircleCheck,
  Clock,
  type LucideIcon,
} from "lucide-react"

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
    ink: "text-sla-breach",
    badge: "bg-sla-breach-bg text-sla-breach",
    fill: "bg-sla-breach",
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
  // "red alert icon" reads identically across both tables.
  out_of_adherence: {
    label: "Out of adherence",
    icon: CircleAlert,
    ink: "text-sla-breach",
    badge: "bg-sla-breach-bg text-sla-breach",
    fill: "bg-sla-breach",
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
 */
function StatusDot({ status, decorative = false, className }: StatusDotProps) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center", className)}>
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
      className={cn("gap-1.5 border-transparent", meta.badge, className)}
    >
      <StatusDot status={status} decorative />
      {meta.label}
      {children}
    </Badge>
  )
}

export { StatusBadge, StatusDot, statusTextClass, statusFillClass }
