import { deltaDirection, formatSigned } from "@workspace/ui/lib/delta"
import { cn } from "@workspace/ui/lib/utils"

// Signed value vs. a target/forecast with semantic direction color. The value
// is a raw signed number — the component owns sign/arrow/color so every delta
// on the page reads identically. Good/bad framing is the consumer's call via
// `invert` (volume over forecast is bad; SLA attainment over target is good).
// Direction color reuses the canonical status inks — one scale, no drift.
// An unfavorable delta is a WARNING (amber), never the reserved SLA-breach
// red: the arrow glyph carries direction, color only carries mood.

interface MetricDeltaProps {
  /** Raw signed value (e.g. 25 for +25%). */
  value: number
  /** Rendered after the number; deltas here are percentages by default. */
  unit?: string
  /** Set when "up" is bad (over forecast). Default: up is good. */
  invert?: boolean
  className?: string
}

function MetricDelta({
  value,
  unit = "%",
  invert = false,
  className,
}: MetricDeltaProps) {
  const direction = deltaDirection(value)
  const tone =
    direction === "flat"
      ? "text-muted-foreground"
      : (direction === "up") !== invert
        ? "text-status-healthy"
        : "text-status-at-risk"

  return (
    <span
      className={cn(
        "text-metric-sm inline-flex items-center gap-0.5",
        tone,
        className,
      )}
    >
      {direction !== "flat" && (
        <span aria-hidden>{direction === "up" ? "▲" : "▼"}</span>
      )}
      {formatSigned(value, unit)}
    </span>
  )
}

export { MetricDelta }
