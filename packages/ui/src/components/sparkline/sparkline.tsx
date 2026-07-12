import {
  statusTextClass,
  type Status,
} from "@workspace/ui/components/status-badge"
import { cn } from "@workspace/ui/lib/utils"

// Inline trend line — a hand-rolled SVG polyline. Ten-ish points need no
// chart dependency; the line is currentColor, tinted only through the
// canonical status scale. Points SNAP on data updates (no path morphing):
// a wall of animating sparklines every tick reads as noise, not signal.

interface SparklineProps {
  points: number[]
  /** Tint from the canonical status scale; neutral (muted) when omitted. */
  status?: Status
  /** ViewBox + rendered size; overridable so a future dense/hero context can rescale without a fork. No consumer overrides yet. */
  width?: number
  height?: number
  /** Accessible summary; defaults to a computed "rising trend from X to Y". */
  label?: string
  className?: string
}

function defaultLabel(points: number[]): string {
  const first = points[0]
  const last = points[points.length - 1]
  if (first === undefined || last === undefined) return "No trend data"
  const direction = last > first ? "Rising" : last < first ? "Falling" : "Flat"
  return `${direction} trend from ${first} to ${last}`
}

function toPolylinePoints(
  points: number[],
  width: number,
  height: number,
  pad: number
): string {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0

  return points
    .map((value, i) => {
      const x = pad + i * stepX
      // flat series renders as a midline
      const y =
        range === 0
          ? height / 2
          : pad + innerH - ((value - min) / range) * innerH
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
}

function Sparkline({
  points,
  status,
  width = 64,
  height = 20,
  label,
  className,
}: SparklineProps) {
  const tint = status ? statusTextClass(status) : "text-muted-foreground"
  const pad = 2

  return (
    <svg
      role="img"
      aria-label={label ?? defaultLabel(points)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      // tint merged LAST: className can adjust layout but never re-tint —
      // the canonical status scale is not per-call negotiable
      className={cn("shrink-0", className, tint)}
    >
      {points.length === 0 ? (
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 3"
          opacity="0.5"
        />
      ) : (
        <polyline
          points={toPolylinePoints(points, width, height, pad)}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

export { Sparkline }
