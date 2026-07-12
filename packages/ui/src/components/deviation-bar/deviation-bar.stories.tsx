import type { Meta, StoryObj } from "@storybook/react-vite"

import { DeviationBar } from "@workspace/ui/components/deviation-bar"

// Leaf visual: loading/empty/error/stale are owned by the surface composing
// it (DataTable, StatCard), so the states here are the value space — over,
// under, at baseline, clamped. The bar is deliberately colorless; verdict
// color lives on the status surfaces beside it.
const meta = {
  title: "primitives/deviation-bar",
  component: DeviationBar,
} satisfies Meta<typeof DeviationBar>

export default meta
type Story = StoryObj<typeof meta>

// Over target: the bar crosses RIGHT past the baseline dot.
export const Over: Story = {
  args: {
    value: 46,
    label: "Billing: longest wait 2m 55s against a 2m target",
  },
}

// Under target: headroom remaining extends left.
export const Under: Story = {
  args: {
    value: -79,
    label: "Onboarding: longest wait 6m 10s against a 30m target",
  },
}

// Exactly at the target: no fill, just the baseline dot.
export const Zero: Story = {
  args: { value: 0, label: "Wait exactly at target" },
}

// value past ±range caps at a full half — proportion, not magnitude.
export const ClampedOverflow: Story = {
  args: {
    value: 150,
    label: "Longest wait 150% over target",
  },
}

// range doing real work: forecast deviations live in ±50-ish territory, so a
// tighter range keeps a +25% overage legible instead of a sliver.
export const ForecastRange: Story = {
  args: {
    value: 25,
    range: 50,
    label: "Volume 25% over forecast",
  },
}

// Density: the queue table's headroom column — the fixture's six queues.
export const Density: Story = {
  args: { value: 46, label: "Billing" },
  render: () => (
    <div className="flex w-24 flex-col gap-2">
      <DeviationBar value={46} label="Billing" />
      <DeviationBar value={44} label="Chat" />
      <DeviationBar value={-17} label="VIP" />
      <DeviationBar value={-37} label="Tier 2" />
      <DeviationBar value={-62} label="General" />
      <DeviationBar value={-79} label="Onboarding" />
    </div>
  ),
}
