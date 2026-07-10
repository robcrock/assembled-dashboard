import type * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

// The canonical status surface. One component covers both value scales of the
// domain language (SLA status and adherence) because they share optics by
// design — the token layer aliases adherence onto the status scale, and this
// map is the single place a status value becomes color + label.
//
// Status is always conveyed by more than color: the badge renders its
// canonical label text; the dot carries an sr-only label unless explicitly
// marked decorative (i.e. adjacent text already names the status).

export type Status =
  | "healthy"
  | "at_risk"
  | "breached"
  | "adherent"
  | "out_of_adherence"

const STATUS_META: Record<Status, { label: string; dot: string; badge: string }> = {
  healthy: {
    label: "Healthy",
    dot: "bg-status-healthy",
    badge: "bg-status-healthy-bg text-status-healthy",
  },
  at_risk: {
    label: "At risk",
    dot: "bg-status-at-risk",
    badge: "bg-status-at-risk-bg text-status-at-risk",
  },
  breached: {
    label: "Breached",
    dot: "bg-status-breached",
    badge: "bg-status-breached-bg text-status-breached",
  },
  adherent: {
    label: "Adherent",
    dot: "bg-adherence-ok",
    badge: "bg-adherence-ok-bg text-adherence-ok",
  },
  out_of_adherence: {
    label: "Out of adherence",
    dot: "bg-adherence-out",
    badge: "bg-adherence-out-bg text-adherence-out",
  },
}

const STATUS_TEXT: Record<Status, string> = {
  healthy: "text-status-healthy",
  at_risk: "text-status-at-risk",
  breached: "text-status-breached",
  adherent: "text-adherence-ok",
  out_of_adherence: "text-adherence-out",
}

/** Canonical status → ink text class, for primitives that tint via currentColor (Sparkline). */
function statusTextClass(status: Status): string {
  return STATUS_TEXT[status]
}

interface StatusDotProps {
  status: Status
  /** Set when adjacent text already names the status, so AT doesn't hear it twice. */
  decorative?: boolean
  className?: string
}

function StatusDot({ status, decorative = false, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span
        aria-hidden
        className={cn("size-2 rounded-full", STATUS_META[status].dot)}
      />
      {!decorative && (
        <span className="sr-only">{STATUS_META[status].label}</span>
      )}
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

export { StatusBadge, StatusDot, statusTextClass }
