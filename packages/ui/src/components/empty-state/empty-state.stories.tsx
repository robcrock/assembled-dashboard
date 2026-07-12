import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/empty-state"

const meta = {
  title: "components/molecules/empty-state",
  component: EmptyState,
  parameters: {
    docs: {
      description: {
        component: `
A deliberate empty, never a blank div: title, optional description, optional \`action\` slot (a slot, not an \`onAction\` prop, per children-over-renderX — pass a Button).

**The feed contract:** this is a leaf state VISUAL, not a state owner. The feed owners (\`StatCard\`, \`DataTable\`) render it internally when their \`feed\` / rows say so — consumers pass a feed to an owner rather than composing this by hand. Reach for it directly only when building a new surface that owns its own feed states.

**Use it for:** "no data" that is true and normal — nothing matched a filter, nothing reported yet.

**Not for:** failures (\`ErrorState\`), late-but-present data (\`StaleIndicator\`), or loading (\`Skeleton\`).

**Deliberately omitted:** icons; an \`onAction\` callback (the action is whatever node you slot in).
`,
      },
    },
  },
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
