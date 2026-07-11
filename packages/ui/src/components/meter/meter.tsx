import {
  statusFillClass,
  type Status,
} from "@workspace/ui/components/status-badge"
import { cn } from "@workspace/ui/lib/utils"

// Normalized fill against a bound — SLA pressure, utilization. The fill is
// tinted only through the canonical status scale (neutral when untinted) via
// statusFillClass, so meters can never invent a fourth severity color or drift
// from the badges. Overflow (value > max) caps the fill at 100%; the number
// that says HOW far over lives beside it in a MetricDelta — the meter shows
// saturation, not magnitude.

interface MeterProps {
  /** Current value, in the same unit as `max`. */
  value: number
  /** The bound the value is measured against. */
  max: number
  /** Accessible name — what this meter measures (e.g. "Billing SLA target consumed"). */
  label: string
  /** Tint from the canonical status scale; neutral (muted ink) when omitted. */
  status?: Status
  className?: string
}

function Meter({ value, max, label, status, className }: MeterProps) {
  const safeMax = max > 0 ? max : 1
  const ratio = Math.max(0, value) / safeMax
  const fillPct = Math.min(ratio, 1) * 100

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={Math.round(safeMax)}
      className={cn("bg-muted h-1.5 w-16 overflow-hidden rounded-full", className)}
    >
      <div
        className={cn(
          "h-full rounded-full",
          status ? statusFillClass(status) : "bg-muted-foreground",
        )}
        style={{ width: `${fillPct}%` }}
      />
    </div>
  )
}

export { Meter }
