import type { Meta, StoryObj } from "@storybook/react-vite"

import { MetricDelta } from "@workspace/ui/components/metric-delta"

const meta = {
  title: "primitives/metric-delta",
  component: MetricDelta,
} satisfies Meta<typeof MetricDelta>

export default meta
type Story = StoryObj<typeof meta>

// Deltas are colorless annotations: the thin arrow carries direction, and
// good/bad verdicts belong to the status surfaces (badges, meters, bars).
export const Up: Story = {
  args: { value: 4 },
}

export const Down: Story = {
  args: { value: -12 },
}

export const Flat: Story = {
  args: { value: 0 },
}

export const CustomUnit: Story = {
  args: { value: 55, unit: "s" },
}
