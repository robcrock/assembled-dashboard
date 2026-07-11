import type { Meta, StoryObj } from "@storybook/react-vite"

import { SparkBars } from "@workspace/ui/components/spark-bars"

// Series lifted from the fixture's wait_trend_sec narratives.
const BILLING_RISING = [48, 55, 70, 88, 105, 118, 132, 150, 168, 175]
const VIP_RECOVERING = [60, 65, 80, 120, 190, 260, 310, 330, 300, 250]
const TIER2_STEADY = [180, 190, 200, 210, 230, 250, 260, 255, 240, 230]

const meta = {
  title: "primitives/spark-bars",
  component: SparkBars,
} satisfies Meta<typeof SparkBars>

export default meta
type Story = StoryObj<typeof meta>

// Breach story: the last bars cross the 120s promise and light up.
export const BreachedTail: Story = {
  args: { points: BILLING_RISING, threshold: 120, status: "breached" },
}

// Recovery story: the middle spiked over, the tail is coming back down.
export const RecoveringSpike: Story = {
  args: { points: VIP_RECOVERING, threshold: 300, status: "at_risk" },
}

// All under the promise — every bar stays neutral.
export const AllWithinThreshold: Story = {
  args: { points: TIER2_STEADY, threshold: 600 },
}

// No threshold: plain neutral magnitude bars.
export const NoThreshold: Story = {
  args: { points: TIER2_STEADY },
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
    status: "breached",
    label: "Longest wait crossed the 2m SLA in the last 3 samples",
  },
}

// Density: a column of row-sized trends, as they'll sit in the queue table.
export const Density: Story = {
  args: { points: TIER2_STEADY },
  render: () => (
    <div className="flex flex-col gap-2">
      <SparkBars points={BILLING_RISING} threshold={120} status="breached" />
      <SparkBars points={VIP_RECOVERING} threshold={300} status="at_risk" />
      <SparkBars points={TIER2_STEADY} threshold={600} />
      <SparkBars points={TIER2_STEADY} />
    </div>
  ),
}
