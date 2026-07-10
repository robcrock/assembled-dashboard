import type { Meta, StoryObj } from "@storybook/react-vite"

import { StaleIndicator } from "@workspace/ui/components/stale-indicator"

const meta = {
  title: "primitives/stale-indicator",
  component: StaleIndicator,
} satisfies Meta<typeof StaleIndicator>

export default meta
type Story = StoryObj<typeof meta>

// Ticks live from mount — "Updated 0s ago" counting up.
export const Live: Story = {
  render: () => <StaleIndicator lastUpdatedAt={Date.now()} tone="live" />,
  args: { lastUpdatedAt: 0 },
}

// The state most dashboards skip: data present but the tick is late.
export const Stale: Story = {
  render: () => (
    <StaleIndicator lastUpdatedAt={Date.now() - 42_000} tone="stale" />
  ),
  args: { lastUpdatedAt: 0 },
}

export const NoDataYet: Story = {
  args: { lastUpdatedAt: null },
}
