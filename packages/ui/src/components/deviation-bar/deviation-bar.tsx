import { cn } from "@workspace/ui/lib/utils"

// Signed deviation around a center baseline — how far a value sits over or
// under its target, as a bar diverging from a baseline dot. Positive values
// extend RIGHT ("crossed past the promise"), negative extend left; the sign IS
// the direction, so there is no invert/direction prop. The bar is deliberately
// COLORLESS — one neutral muted fill, no status tint at all: it shows
// direction + proportion, and any verdict lives on the status surfaces beside
// it (badges), never here. The number that says exactly how far lives beside
// it too (e.g. a MetricDelta) — never inside.
//
// Contrast with Meter: Meter is a normalized 0→max fill (saturation against a
// bound); DeviationBar is a signed distance from a baseline. Different
// questions, different primitives.

interface DeviationBarProps {
  /** Signed deviation from the baseline, in percent (e.g. +46 = 46% over). */
  value: number
  /** Accessible name — what this bar measures (e.g. "Billing: longest wait 2m 55s against a 2m target"). */
  label: string
  /** Clamp bound for each half; deviations past ±range render a full half. */
  range?: number
  className?: string
}

function DeviationBar({ value, label, range = 100, className }: DeviationBarProps) {
  const safeRange = range > 0 ? range : 100
  const clamped = Math.max(-safeRange, Math.min(value, safeRange))
  const halfPct = (Math.abs(clamped) / safeRange) * 50

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={-safeRange}
      aria-valuemax={safeRange}
      className={cn("bg-muted relative h-1.5 w-24 rounded-full", className)}
    >
      <div
        className="bg-muted-foreground absolute inset-y-0 rounded-full"
        style={
          clamped >= 0
            ? { left: "50%", width: `${halfPct}%` }
            : { right: "50%", width: `${halfPct}%` }
        }
      />
      {/* Baseline dot — the target itself, punched through the track so the
          fill visibly departs FROM somewhere. */}
      <span
        aria-hidden
        className="bg-background ring-border absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1"
      />
    </div>
  )
}

export { DeviationBar }
