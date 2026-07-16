import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// A BULLET GRAPH, in a table cell.
//
// This anatomy has a specification, and it is not ours: Stephen Few's Bullet
// Graph Design Specification (https://www.perceptualedge.com/articles/misc/
// Bullet_Graph_Design_Spec.pdf) names exactly these parts — a FEATURED MEASURE
// that "should be visually prominent", a COMPARATIVE MEASURE that is "less
// visually dominant", and collectively "the measures". Reading the cell as a
// bullet graph is what gives the slots their names, and it is worth saying out
// loud that the chart world modelled this precisely while the design-system
// world never did: Polaris, Atlassian, Primer and NN/g have no term for it,
// because all of them model a stat as a single value plus a pre-reduced
// percentage.
//
// Why `measures` is ONE slot and not `actual` + `target`: Few's comparative
// measure spans "a target — or the same measure at some point in the past",
// and this dashboard uses both. Headroom compares a wait against a PROMISE;
// volume compares actual against a FORECAST, which is a prediction, not a
// promise. Two props would name one of those wrong. Splitting them would also
// force this component to render the "/" between them, which would put number
// formatting inside an anatomy that explicitly disclaims it (see below).
//
// The naming rule the set follows: NAME THE SLOT FOR ITS CONTENT. `delta`
// holds a MetricDelta, `bar` holds a DeviationBar, and `measures` holds the
// measures. The word this replaced — `absolutes` — was the only slot that
// broke the rule, because it was defined by contrast with its neighbour
// (absolute vs relative), which is a RENDERING distinction rather than a
// statement of what the slot is for.

interface DeviationCellProps {
  /**
   * The featured measure and its comparative measure, as one line: the
   * observed figure, a separator, and the thing it is measured against
   * ("2m 55s / 2m", "70 / 56"). The caller writes both and the separator —
   * this component formats no numbers and knows no units.
   */
  measures: React.ReactNode
  /** The signed percentage beside the measures — a `MetricDelta`. Muted sub-text to the measures' row ink. */
  delta: React.ReactNode
  /** The diverging bar beneath — a `DeviationBar`, whose baseline dot IS the comparative measure. */
  bar: React.ReactNode
  className?: string
}

/**
 * The "value against its own target" cell anatomy: a context line (measures
 * left, signed percent right) over a full-width diverging bar whose baseline
 * dot is the target itself.
 *
 * **Use it for:** a table cell that answers "how far is this from where it
 * should be?" — the dashboard's Headroom (wait vs SLA target) and Actual /
 * forecast (volume vs plan) columns, which are the same question over
 * different keys.
 *
 * **Not for:** saturation ("how full is this?" — that's `Meter`, a 0→max
 * fill), a trend over time (`Sparkline`, `SparkBars`), or a bare number with a
 * delta (`StatCard`). The distinction from `Meter` is the one worth holding:
 * this measures DISTANCE FROM A TARGET, which is signed and can point either
 * way; a meter measures fill, which cannot.
 *
 * **Deliberately omitted:**
 * - **An `invert` prop.** Tremor's `DeltaBar` ships `isIncreasePositive` and
 *   it is exactly the prop this system bans by name: the sign IS the
 *   direction. Our closest prior art having it is a documented divergence,
 *   not an oversight.
 * - **A `status` tint.** The cell is colourless on purpose — the verdict rides
 *   on the row's Status badge, and orange means one thing only (a broken
 *   promise). An over-forecast is a leading indicator, not a verdict.
 * - **Number formatting, units, and the separator.** They ride in `measures`.
 *   A component that formatted them would need a unit prop, a locale, and a
 *   duration formatter — and it would still be wrong for the next pair.
 * - **A `width` prop.** The fixed `w-36` is what lets `layout="fixed"` columns
 *   hold still while the figures tick; `className` overrides it where a
 *   consumer genuinely needs to.
 */
function DeviationCell({
  measures,
  delta,
  bar,
  className,
}: DeviationCellProps) {
  return (
    <div className={cn("flex w-36 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        {/* The cell's PRIMARY line: row ink (inherited, never explicit), NOT
            muted; the delta beside it is the muted sub-text. Inheriting is
            what lets an editable measure sit in this line at the line's own
            scale — a size set here would fight the box that holds it. */}
        <span className="text-metric-sm">{measures}</span>
        {delta}
      </div>
      {bar}
    </div>
  )
}

export { DeviationCell }
