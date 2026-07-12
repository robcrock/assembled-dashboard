import type { Meta, StoryObj } from "@storybook/react-vite"

import { ErrorState } from "@workspace/ui/components/error-state"

const meta = {
  title: "molecules/error-state",
  component: ErrorState,
  parameters: {
    docs: {
      description: {
        component: `
The failed-load surface with the retry affordance. \`role="alert"\` so assistive tech announces the failure when it appears. It takes the raw reserved breach accent (\`--sla-breach\`) deliberately — a feed that fails is a broken promise to the operator; the \`--status-breached\` alias stays for SLA-status surfaces.

**The feed contract:** this is a leaf state VISUAL, not a state owner. The feed owners (\`StatCard\`, \`DataTable\`) render it internally on \`feed.status === "error"\` — consumers pass a feed to an owner rather than composing this by hand. Reach for it directly only when building a new surface that owns its own feed states.

**Use it for:** a failed load. Pass \`onRetry\` when the consumer has a meaningful retry; omit it and the button disappears. \`title\` defaults to a generic headline — put the upstream message in \`description\`.

**Not for:** empty data (\`EmptyState\`) or late-but-present data (\`StaleIndicator\` — stale never degrades to an error).

**Deliberately omitted:** icons; error-object parsing (the consumer decides what message to surface).
`,
      },
    },
  },
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
