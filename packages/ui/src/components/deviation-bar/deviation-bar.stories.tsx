import type { Meta, StoryObj } from "@storybook/react-vite"

import { DeviationBar } from "@workspace/ui/components/deviation-bar"

// Leaf visual: loading/empty/error/stale are owned by the surface composing
// it (DataTable, StatCard), so the states here are the value space — over,
// under, at baseline, clamped — across the canonical status tints.
const meta = {
  title: "primitives/deviation-bar",
  component: DeviationBar,
} satisfies Meta<typeof DeviationBar>

export default meta
type Story = StoryObj<typeof meta>

// Over target: the bar crosses RIGHT past the baseline dot.
export const OverBreached: Story = {
  args: {
    value: 46,
    status: "breached",
    label: "Billing: longest wait 2m 55s against a 2m target",
  },
}

// Under target: headroom remaining extends left, in the calm healthy tint.
export const UnderHealthy: Story = {
  args: {
    value: -79,
    status: "healthy",
    label: "Onboarding: longest wait 6m 10s against a 30m target",
  },
}

export const AtRiskRecovering: Story = {
  args: {
    value: -17,
    status: "at_risk",
    label: "VIP: longest wait 4m 10s against a 5m target",
  },
}

// Exactly at the target: no fill, just the baseline dot.
export const Zero: Story = {
  args: { value: 0, status: "at_risk", label: "Wait exactly at target" },
}

// value past ±range caps at a full half — proportion, not magnitude.
export const ClampedOverflow: Story = {
  args: {
    value: 150,
    status: "breached",
    label: "Longest wait 150% over target",
  },
}

// No status: neutral muted fill for non-severity deviations.
export const Neutral: Story = {
  args: { value: -30, label: "Utilization 30% under plan" },
}

// Density: the queue table's headroom column — the fixture's six queues.
export const Density: Story = {
  args: { value: 46, label: "Billing" },
  render: () => (
    <div className="flex w-24 flex-col gap-2">
      <DeviationBar value={46} status="breached" label="Billing" />
      <DeviationBar value={44} status="breached" label="Chat" />
      <DeviationBar value={-17} status="at_risk" label="VIP" />
      <DeviationBar value={-37} status="healthy" label="Tier 2" />
      <DeviationBar value={-62} status="healthy" label="General" />
      <DeviationBar value={-79} status="healthy" label="Onboarding" />
    </div>
  ),
}
