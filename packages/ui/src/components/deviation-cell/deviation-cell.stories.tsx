import type { Meta, StoryObj } from "@storybook/react-vite"

import { DeviationCell } from "@workspace/ui/components/deviation-cell"
import { DeviationBar } from "@workspace/ui/components/deviation-bar"
import { Duration } from "@workspace/ui/components/duration"
import { MetricDelta } from "@workspace/ui/components/metric-delta"

const meta = {
  title: "components/molecules/deviation-cell",
  component: DeviationCell,
  parameters: {
    docs: {
      description: {
        component: `
**A bullet graph, in a table cell.** A context line (the measures left, a signed percent right) over a full-width diverging bar whose baseline dot is the target itself.

The anatomy isn't ours — it's [Stephen Few's Bullet Graph Design Specification](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf), which names exactly these parts: a **featured measure** that *"should be visually prominent"*, a **comparative measure** that is *"less visually dominant"*, and collectively *"the measures"*. Worth saying plainly: the chart world modelled this precisely and the design-system world never did — Polaris, Atlassian, Primer and NN/g have no term for it, because they all model a stat as a single value plus a pre-reduced percentage.

**Use it for:** a cell that answers *"how far is this from where it should be?"* — the dashboard's **Headroom** (wait vs SLA target) and **Actual / forecast** (volume vs plan), which are the same question over different keys.

**Not for:** saturation (*"how full is this?"* — that's \`Meter\`, a 0→max fill), a trend over time (\`SparkBars\`), or a bare number with a delta (\`StatCard\`). The line against \`Meter\` is the one worth holding: this measures **distance from a target**, which is signed and can point either way; a fill cannot.

**Why \`measures\` is one slot, not \`actual\` + \`target\`:** Few's comparative measure spans *"a target — or the same measure at some point in the past"*, and this dashboard uses both. Headroom compares a wait against a **promise**; volume compares actual against a **forecast**, which is a prediction. Two props would name one of them wrong. It would also force this component to render the \`/\`, putting number formatting inside an anatomy that explicitly disclaims it.

**Deliberately omitted:**
- **An \`invert\` prop.** Tremor's \`DeltaBar\` ships \`isIncreasePositive\`, which is exactly the prop this system bans by name — the sign IS the direction. Our closest prior art having it is a documented divergence, not an oversight.
- **A \`status\` tint.** Colourless on purpose: the verdict rides on the row's Status badge, and orange means one thing only. An over-forecast is a leading indicator, not a verdict.
- **Number formatting, units, the separator.** They ride in \`measures\`. A component that formatted them would need a unit prop, a locale, and a duration formatter — and would still be wrong for the next pair.
- **A \`width\` prop.** The fixed \`w-36\` is what lets \`layout="fixed"\` columns hold still while figures tick; \`className\` overrides it where a consumer genuinely needs to.

Three slots, no state: it holds nothing and decides nothing. Feed states belong to the table around it.
`,
      },
    },
  },
} satisfies Meta<typeof DeviationCell>

export default meta
type Story = StoryObj<typeof meta>

const label = (name: string, wait: number, target: number) =>
  `${name}: longest wait ${wait}s against a ${target}s target`

export const Headroom: Story = {
  args: {
    measures: (
      <>
        <Duration seconds={175} /> / <Duration seconds={120} />
      </>
    ),
    delta: <MetricDelta value={46} />,
    bar: (
      <DeviationBar
        value={46}
        label={label("Billing", 175, 120)}
        className="w-full"
      />
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "The dashboard's Headroom cell: a longest wait against the queue's own promise. The bar crosses right past the baseline dot because the wait is over target — direction reads from the crossing, not from a colour.",
      },
    },
  },
}

export const Forecast: Story = {
  args: {
    measures: <>70 / 56</>,
    delta: <MetricDelta value={25} />,
    bar: (
      <DeviationBar
        value={25}
        range={50}
        label="Billing: 70 tickets last 15m against a forecast of 56"
        className="w-full"
      />
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "The twin, and visibly the twin: the same anatomy over a different pair. Here the comparative measure is a **forecast** — a prediction, not a promise — which is precisely why `measures` is one slot rather than an `actual` + `target` pair that would name it wrong.",
      },
    },
  },
}

export const Under: Story = {
  args: {
    measures: (
      <>
        <Duration seconds={190} /> / <Duration seconds={300} />
      </>
    ),
    delta: <MetricDelta value={-37} />,
    bar: (
      <DeviationBar
        value={-37}
        label={label("General Support", 190, 300)}
        className="w-full"
      />
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Comfortably inside the promise: the bar extends **left** of the baseline dot and the delta carries a minus sign. Same ink as the breaching row above — the cell never renders a verdict, so a healthy row and a breaching one differ only by direction and magnitude.",
      },
    },
  },
}

export const AtTarget: Story = {
  args: {
    measures: <>37 / 37</>,
    delta: <MetricDelta value={0} />,
    bar: (
      <DeviationBar
        value={0}
        range={50}
        label="Tier 2: 37 tickets last 15m against a forecast of 37"
        className="w-full"
      />
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Exactly on target: the bar collapses to its baseline dot. The zero case is the one that proves the dot is the target rather than a decoration.",
      },
    },
  },
}

export const InARow: Story = {
  args: { measures: null, delta: null, bar: null },
  render: () => (
    <div className="flex flex-col gap-3">
      {[
        { name: "Billing", wait: 175, target: 120, pct: 46 },
        { name: "Live Chat", wait: 260, target: 180, pct: 44 },
        { name: "VIP", wait: 250, target: 300, pct: -17 },
        { name: "Onboarding", wait: 370, target: 1800, pct: -79 },
      ].map((q) => (
        <DeviationCell
          key={q.name}
          measures={
            <>
              <Duration seconds={q.wait} /> / <Duration seconds={q.target} />
            </>
          }
          delta={<MetricDelta value={q.pct} />}
          bar={
            <DeviationBar
              value={q.pct}
              label={label(q.name, q.wait, q.target)}
              className="w-full"
            />
          }
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Four rows, the density case. The fixed `w-36` and tabular figures are what make a column of these scannable: the baseline dots line up, so the eye reads distance-from-target down the column without reading a single number.",
      },
    },
  },
}
