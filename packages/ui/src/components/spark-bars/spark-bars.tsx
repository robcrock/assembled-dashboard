import { cn } from "@workspace/ui/lib/utils"

// Inline trend bars — a hand-rolled SVG column series. Ten-ish points need
// no chart dependency. Bars grow from a ZERO baseline (honest magnitude,
// unlike a min/max-normalized line), and only bars EXCEEDING the threshold
// take the reserved SLA-breach accent — a sample past the promise IS a
// breach, so the tint is not configurable. The rest stay neutral, making
// "how often did we cross the promise" readable at a glance without a
// directional arrow. Bars SNAP on data updates (no height morphing): a wall
// of animating charts every tick reads as noise, not signal.

interface SparkBarsProps {
  points: number[]
  /**
   * The reference the bars are judged against (e.g. the SLA target, in the
   * same unit as `points`). Bars above it are tinted; bars at/below stay
   * neutral. Omit for an all-neutral series.
   */
  threshold?: number
  /**
   * The rolling window: the chart always reserves exactly this many bar
   * slots and shows the LAST `bands` points. Fewer points leave empty slots
   * on the LEFT — the newest sample always sits flush against the right
   * edge, so bar width never jumps as the window fills. Exercised on every
   * replay walkthrough (history frames carry growing 1→10-point windows);
   * no consumer overrides the default, which matches the full window.
   */
  bands?: number
  /** ViewBox + rendered size; overridable so a denser/hero context can rescale without a fork. No consumer overrides yet. */
  width?: number
  height?: number
  /** Accessible summary; defaults to a computed "N of M above threshold". */
  label?: string
  className?: string
}

function defaultLabel(points: number[], threshold: number | undefined): string {
  if (points.length === 0) return "No trend data"
  const first = points[0]
  const last = points[points.length - 1]
  const trend = `trend from ${first} to ${last}`
  if (threshold === undefined) return `Bar ${trend}`
  const over = points.filter((p) => p > threshold).length
  return over === 0
    ? `Bar ${trend}, all within the ${threshold} threshold`
    : `Bar ${trend}, ${over} of ${points.length} above the ${threshold} threshold`
}

function SparkBars({
  points,
  threshold,
  bands = 10,
  width = 64,
  height = 20,
  label,
  className,
}: SparkBarsProps) {
  const pad = 1
  const gap = 2
  const innerW = width - pad * 2
  const innerH = height - pad
  // Rolling window: only the last `bands` samples render, and geometry is
  // computed from the SLOT count, not the sample count — bar width is stable
  // and the series always terminates at the right edge (the "now" edge).
  const visible = points.slice(-bands)
  const offset = bands - visible.length
  // Scale to the visible series itself, NOT the threshold: a healthy queue's
  // waits can sit at 5% of a 30-minute promise, and threshold-scaling would
  // crush every bar to the floor. Height carries the trend SHAPE; the tint
  // alone carries the threshold story.
  const scaleMax = Math.max(...visible, 1)
  const barW = (innerW - gap * (bands - 1)) / bands

  return (
    <svg
      role="img"
      aria-label={label ?? defaultLabel(visible, threshold)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("shrink-0", className)}
    >
      {visible.length === 0 ? (
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 3"
          className="text-muted-foreground"
          opacity="0.5"
        />
      ) : (
        visible.map((value, i) => {
          // 1.5px floor keeps near-zero samples visible
          const h = Math.max((value / scaleMax) * innerH, 1.5)
          const over = threshold !== undefined && value > threshold
          return (
            <rect
              key={i}
              x={pad + (offset + i) * (barW + gap)}
              y={height - h}
              width={barW}
              height={h}
              rx={Math.min(1.5, barW / 2)}
              fill="currentColor"
              className={cn(
                over ? "text-sla-breach" : "text-muted-foreground/60",
              )}
            />
          )
        })
      )}
    </svg>
  )
}

export { SparkBars }
