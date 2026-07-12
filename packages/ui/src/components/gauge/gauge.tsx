import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// A single normalized value as an open-bottom arc (~240° sweep) — the "how
// are we doing overall" hero number. The gauge owns ONLY the arc: the big
// figure, delta, and caption render in the center slot via children, so the
// gauge never formats numbers. Track takes the muted token, the value arc
// takes currentColor (foreground by default) — tokens only: no gradient, no
// threshold zones, no needle, no animation. Verdict color stays on the status
// surfaces; the gauge is a reading, not a verdict.

const SWEEP_DEG = 240
const START_DEG = 150 // left-below-horizontal; sweep runs over the top
const R = 40
const CX = 50
const CY = 50

function polar(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)]
}

/** Arc path from START_DEG spanning `deg` degrees clockwise (over the top). */
function arcPath(deg: number): string {
  const [sx, sy] = polar(START_DEG)
  const [ex, ey] = polar(START_DEG + deg)
  const largeArc = deg > 180 ? 1 : 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
}

interface GaugeProps {
  /** Normalized reading, 0–100. */
  value: number
  /** Accessible name — what this gauge measures (e.g. "SLA attainment"). */
  label: string
  /** Center content — the big figure / delta / caption. The gauge never formats numbers. */
  children?: React.ReactNode
  className?: string
}

function Gauge({ value, label, children, className }: GaugeProps) {
  const clamped = Math.max(0, Math.min(value, 100))
  const valueDeg = (clamped / 100) * SWEEP_DEG

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative size-44", className)}
    >
      <svg viewBox="0 0 100 100" aria-hidden className="size-full">
        <path
          d={arcPath(SWEEP_DEG)}
          className="text-muted"
          stroke="currentColor"
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
        />
        {/* Round caps make a zero-length arc read as a dot — skip at 0. */}
        {valueDeg > 0 && (
          <path
            d={arcPath(valueDeg)}
            className="text-foreground"
            stroke="currentColor"
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

export { Gauge }
