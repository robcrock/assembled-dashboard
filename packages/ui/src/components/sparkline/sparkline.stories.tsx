import type { Meta, StoryObj } from "@storybook/react-vite"

import { Sparkline } from "@workspace/ui/components/sparkline"

// Series lifted from the fixture's wait_trend_sec narratives.
const BILLING_RISING = [48, 55, 70, 88, 105, 118, 132, 150, 168, 175]
const VIP_RECOVERING = [60, 65, 80, 120, 190, 260, 310, 330, 300, 250]
const TIER2_STEADY = [180, 190, 200, 210, 230, 250, 260, 255, 240, 230]

const meta = {
  title: "primitives/sparkline",
  component: Sparkline,
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

// Density: a column of row-sized trends, as they'll sit in the queue table.
export const Density: Story = {
  args: { points: TIER2_STEADY },
  render: () => (
    <div className="flex flex-col gap-2">
      <Sparkline points={BILLING_RISING} status="breached" />
      <Sparkline points={VIP_RECOVERING} status="at_risk" />
      <Sparkline points={TIER2_STEADY} status="healthy" />
      <Sparkline points={TIER2_STEADY} />
    </div>
  ),
}
