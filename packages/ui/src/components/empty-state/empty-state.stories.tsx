import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/empty-state"

const meta = {
  title: "primitives/empty-state",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: "No queues to show",
    description: "Queues appear here as soon as the feed reports them.",
  },
}

export const WithAction: Story = {
  args: {
    title: "No agents match this filter",
    description: "Everyone is currently adherent.",
    action: (
      <Button variant="outline" size="sm">
        Show all agents
      </Button>
    ),
  },
}

export const TitleOnly: Story = {
  args: { title: "Nothing here yet" },
}
