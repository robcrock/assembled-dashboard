import type { Meta, StoryObj } from "@storybook/react-vite"

import { Meter } from "@workspace/ui/components/meter"

const meta = {
  title: "atoms/meter",
  component: Meter,
} satisfies Meta<typeof Meter>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {
  args: { value: 45, max: 100, label: "Utilization" },
}

export const Healthy: Story = {
  args: { value: 370, max: 1800, label: "Onboarding SLA target consumed", status: "healthy" },
}

export const AtRisk: Story = {
  args: { value: 250, max: 300, label: "VIP SLA target consumed", status: "at_risk" },
}

// value > max: the fill caps at 100% — magnitude belongs to a MetricDelta beside it.
export const BreachedOverflow: Story = {
  args: { value: 175, max: 120, label: "Billing SLA target consumed", status: "breached" },
}

export const EmptyFill: Story = {
  args: { value: 0, max: 100, label: "No wait", status: "healthy" },
}

// Density: as the meters sit stacked in the queue table's headroom column.
export const Density: Story = {
  args: { value: 45, max: 100, label: "Utilization" },
  render: () => (
    <div className="flex flex-col gap-2">
      <Meter value={175} max={120} label="Billing" status="breached" />
      <Meter value={172} max={120} label="Chat" status="breached" />
      <Meter value={250} max={300} label="VIP" status="at_risk" />
      <Meter value={230} max={600} label="Tier 2" status="healthy" />
      <Meter value={370} max={1800} label="Onboarding" status="healthy" />
    </div>
  ),
}
