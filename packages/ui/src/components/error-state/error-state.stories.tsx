import type { Meta, StoryObj } from "@storybook/react-vite"

import { ErrorState } from "@workspace/ui/components/error-state"

const meta = {
  title: "molecules/error-state",
  component: ErrorState,
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const WithRetry: Story = {
  args: {
    description: "Dashboard API responded 500",
    onRetry: () => {},
  },
}

export const WithoutRetry: Story = {
  args: {
    title: "Feed unavailable",
    description: "The metrics service is not reachable right now.",
  },
}

export const Minimal: Story = {
  args: {},
}
