import type { Meta, StoryObj } from "@storybook/react-vite"

import { SparkBars } from "@workspace/ui/components/spark-bars"

// Series lifted from the fixture's wait_trend_sec narratives.
const BILLING_RISING = [48, 55, 70, 88, 105, 118, 132, 150, 168, 175]
const VIP_RECOVERING = [60, 65, 80, 120, 190, 260, 310, 330, 300, 250]
const TIER2_STEADY = [180, 190, 200, 210, 230, 250, 260, 255, 240, 230]

const meta = {
  title: "atoms/spark-bars",
  component: SparkBars,
  parameters: {
    docs: {
      description: {
        component: `
An inline SVG bar series growing from a **zero baseline**; bars that exceed \`threshold\` take the reserved SLA-breach accent, the rest stay neutral.

**Use it for:** "how often did we cross the promise" — per-tick threshold crossings against a limit (the queue table's \`wait_trend_sec\` against the SLA target). The zero baseline keeps magnitude honest, unlike a min/max-normalized line.

**Not for:**
- Trend shape without a limit — \`Sparkline\`.
- Saturation toward a bound — \`Meter\`.
- Signed distance from a baseline/target — \`DeviationBar\`.
- One normalized hero reading — \`Gauge\`.

**Deliberately omitted:** a configurable tint — a sample past the promise IS a breach, so the over-threshold accent is not overridable; a tinted bar always means "over threshold". No animation either: bars SNAP on data updates — a wall of animating charts every tick reads as noise, not signal.

Mechanics worth knowing: \`bands\` reserves a fixed number of bar slots and shows the LAST N points — fewer points leave empty slots on the left, so the newest sample sits flush against the right ("now") edge and bar width never jumps as the window fills. Bars scale to the visible series, not the threshold — height carries the trend shape; the tint alone carries the threshold story. Computed "N of M above the threshold" aria-label, overridable via \`label\`.

Stateless leaf: it never owns feed states — loading/empty/error/stale live on the composing surface (\`StatCard\`, \`DataTable\`, sections).
`,
      },
    },
  },
} satisfies Meta<typeof SparkBars>

export default meta
type Story = StoryObj<typeof meta>

export const BreachedTail: Story = {
  args: { points: BILLING_RISING, threshold: 120 },
  parameters: {
    docs: {
      description: {
        story:
          "Breach story: the last bars cross the 120s promise and take the reserved SLA-breach accent — the only place the breach color exists, so the tint is fixed.",
      },
    },
  },
}

export const RecoveringSpike: Story = {
  args: { points: VIP_RECOVERING, threshold: 300 },
  parameters: {
    docs: {
      description: {
        story:
          "Recovery story: the middle spiked over, the tail is coming back down.",
      },
    },
  },
}

export const AllWithinThreshold: Story = {
  args: { points: TIER2_STEADY, threshold: 600 },
  parameters: {
    docs: {
      description: {
        story: "All under the promise — every bar stays neutral.",
      },
    },
  },
}

export const NoThreshold: Story = {
  args: { points: TIER2_STEADY },
  parameters: {
    docs: {
      description: {
        story: "No threshold: plain neutral magnitude bars.",
      },
    },
  },
}

export const SinglePoint: Story = {
  args: { points: [90], threshold: 60 },
}

export const Empty: Story = {
  args: { points: [] },
}

export const CustomLabel: Story = {
  args: {
    points: BILLING_RISING,
    threshold: 120,
    label: "Longest wait crossed the 2m SLA in the last 3 samples",
  },
}

export const Density: Story = {
  args: { points: TIER2_STEADY },
  parameters: {
    docs: {
      description: {
        story:
          "Density: a column of row-sized trends, as they'll sit in the queue table.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-2">
      <SparkBars points={BILLING_RISING} threshold={120} />
      <SparkBars points={VIP_RECOVERING} threshold={300} />
      <SparkBars points={TIER2_STEADY} threshold={600} />
      <SparkBars points={TIER2_STEADY} />
    </div>
  ),
}
