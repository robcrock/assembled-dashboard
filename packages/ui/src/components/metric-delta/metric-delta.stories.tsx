import type { Meta, StoryObj } from "@storybook/react-vite"

import { MetricDelta } from "@workspace/ui/components/metric-delta"

const meta = {
  title: "primitives/metric-delta",
  component: MetricDelta,
} satisfies Meta<typeof MetricDelta>

export default meta
type Story = StoryObj<typeof meta>

export const UpGood: Story = {
  args: { value: 4 },
}

export const DownBad: Story = {
  args: { value: -12 },
}

// Volume over forecast: up is bad — the leading indicator of the next breach.
export const UpBadInverted: Story = {
  args: { value: 25, invert: true },
}

export const DownGoodInverted: Story = {
  args: { value: -8, invert: true },
}

export const Flat: Story = {
  args: { value: 0 },
}

export const CustomUnit: Story = {
  args: { value: 55, unit: "s", invert: true },
}
