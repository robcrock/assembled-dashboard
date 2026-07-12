import { formatSigned } from "@workspace/ui/lib/delta"
import { cn } from "@workspace/ui/lib/utils"

// Signed value vs. a target/forecast. The value is a raw signed number — the
// component owns the sign so every delta on the page reads identically.
// Deltas are deliberately COLORLESS and glyph-free: the explicit +/− sign
// carries direction on its own, and the muted ink keeps them annotations, not
// verdicts. Whether a move is good or bad already lives in the status
// surfaces (badges) — and the palette's loud red stays reserved for SLA
// breach alone.

interface MetricDeltaProps {
  /** Raw signed value (e.g. 25 for +25%). */
  value: number
  /** Rendered after the number; deltas here are percentages by default. */
  unit?: string
  className?: string
}

function MetricDelta({ value, unit = "%", className }: MetricDeltaProps) {
  return (
    <span className={cn("text-metric-sm text-muted-foreground", className)}>
      {formatSigned(value, unit)}
    </span>
  )
}

export { MetricDelta }
