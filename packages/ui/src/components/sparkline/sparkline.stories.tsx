import type { Meta, StoryObj } from "@storybook/react-vite"

import { Sparkline } from "@workspace/ui/components/sparkline"

// Series lifted from the fixture's wait_trend_sec narratives.
const BILLING_RISING = [48, 55, 70, 88, 105, 118, 132, 150, 168, 175]
const VIP_RECOVERING = [60, 65, 80, 120, 190, 260, 310, 330, 300, 250]
const TIER2_STEADY = [180, 190, 200, 210, 230, 250, 260, 255, 240, 230]

const meta = {
  title: "components/atoms/sparkline",
  component: Sparkline,
  parameters: {
    docs: {
      description: {
        component: `
An inline SVG polyline trend — the **shape of a series over time**, at table-row size, with no chart dependency.

**Use it for:** reading a trend's shape at a glance (rising, falling, recovering) where exact values don't matter. The series is min/max-normalized, so it shows shape, not absolute magnitude. Tint comes only from the canonical status scale via \`status\`; neutral muted when omitted.

**Not for:**
- Counting how often samples crossed a limit — reach for \`SparkBars\` (zero baseline, per-tick threshold tint).
- Saturation toward a bound — \`Meter\`.
- Signed distance from a baseline/target — \`DeviationBar\`.
- One normalized hero reading — \`Gauge\`.

**Deliberately omitted:** chart dependencies, axes, tooltips, and animation — points SNAP on data updates, because a wall of animating sparklines every tick reads as noise, not signal. \`className\` can adjust layout but can never re-tint: the tint class is merged last, so the canonical status scale is not per-call negotiable.

Accessible by default: a computed "Rising/Falling/Flat trend from X to Y" aria-label, overridable via \`label\`. An empty series renders a dashed midline placeholder.

Stateless leaf: it never owns feed states — loading/empty/error/stale live on the composing surface (\`StatCard\`, \`DataTable\`, sections).
`,
      },
    },
  },
} satisfies Meta<typeof Sparkline>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {
  args: { points: TIER2_STEADY },
}

export const RisingBreached: Story = {
  args: { points: BILLING_RISING, status: "breached" },
}

export const RecoveringAtRisk: Story = {
  args: { points: VIP_RECOVERING, status: "at_risk" },
}

export const Healthy: Story = {
  args: { points: TIER2_STEADY, status: "healthy" },
}

export const Flat: Story = {
  args: { points: [120, 120, 120, 120, 120, 120] },
}

export const SinglePoint: Story = {
  args: { points: [90] },
}

export const Empty: Story = {
  args: { points: [] },
}

export const CustomLabel: Story = {
  args: {
    points: BILLING_RISING,
    status: "breached",
    label: "Longest wait rising from 48s to 175s over the last 50 minutes",
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
      <Sparkline points={BILLING_RISING} status="breached" />
      <Sparkline points={VIP_RECOVERING} status="at_risk" />
      <Sparkline points={TIER2_STEADY} status="healthy" />
      <Sparkline points={TIER2_STEADY} />
    </div>
  ),
}
