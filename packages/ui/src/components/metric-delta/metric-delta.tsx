import { ArrowDown, ArrowUp } from "lucide-react"

import { deltaDirection, formatSigned } from "@workspace/ui/lib/delta"
import { cn } from "@workspace/ui/lib/utils"

// Signed value vs. a target/forecast. The value is a raw signed number — the
// component owns sign + arrow so every delta on the page reads identically.
// Deltas are deliberately COLORLESS: a thin arrow glyph carries direction and
// the muted ink keeps them annotations, not verdicts. Whether a move is good
// or bad already lives in the status surfaces (badges, meters, bars) — and
// the palette's loud red stays reserved for SLA breach alone.

interface MetricDeltaProps {
  /** Raw signed value (e.g. 25 for +25%). */
  value: number
  /** Rendered after the number; deltas here are percentages by default. */
  unit?: string
  className?: string
}

function MetricDelta({ value, unit = "%", className }: MetricDeltaProps) {
  const direction = deltaDirection(value)

  return (
    <span
      className={cn(
        "text-metric-sm text-muted-foreground inline-flex items-center gap-0.5",
        className,
      )}
    >
      {direction === "up" ? (
        <ArrowUp aria-hidden className="size-3" />
      ) : direction === "down" ? (
        <ArrowDown aria-hidden className="size-3" />
      ) : null}
      {formatSigned(value, unit)}
    </span>
  )
}

export { MetricDelta }
