import type { Meta, StoryObj } from "@storybook/react-vite"

import { StaleIndicator } from "@workspace/ui/components/stale-indicator"

const meta = {
  title: "molecules/stale-indicator",
  component: StaleIndicator,
  parameters: {
    docs: {
      description: {
        component: `
"Updated Xs ago" — the honesty surface, and the library's only wall-clock surface. It self-ticks its relative time every second from \`lastUpdatedAt\` (wall-clock ms; \`null\` renders "Updated —").

\`tone\` is deliberately NARROWER than \`FeedStatus\`: this surface has exactly two visual treatments — \`"live"\` (calm muted ink) vs \`"stale"\` (at-risk ink + a "Stale ·" prefix) — so callers map \`feed.status === "stale"\` to \`tone\` at the seam. Page chrome renders it always (loading shows the em-dash placeholder); stale-gated surfaces mount it only when degraded.

**The feed contract:** this is a leaf state VISUAL, not a state owner. The feed owners (\`StatCard\`, \`DataTable\`) mount it internally when \`feed.status === "stale"\` — consumers pass a feed to an owner rather than composing this by hand. It never decides staleness itself: the data hook is the single owner of that logic.

**Use it for:** last-updated honesty beside live data — degrade visibly rather than pretending to be live.

**Not for:** domain durations from the feed (use \`Duration\` — ticking replay time against the wall clock would contradict it).

**Deliberately omitted:** auto-derived staleness (no threshold prop — the hook owns that decision); a full \`FeedStatus\`-shaped prop.
`,
      },
    },
  },
} satisfies Meta<typeof StaleIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {
  render: () => <StaleIndicator lastUpdatedAt={Date.now()} tone="live" />,
  args: { lastUpdatedAt: 0 },
  parameters: {
    docs: {
      description: {
        story: 'Ticks live from mount — "Updated 0s ago" counting up.',
      },
    },
  },
}

export const Stale: Story = {
  render: () => (
    <StaleIndicator lastUpdatedAt={Date.now() - 42_000} tone="stale" />
  ),
  args: { lastUpdatedAt: 0 },
  parameters: {
    docs: {
      description: {
        story:
          "The state most dashboards skip: data present but the tick is late.",
      },
    },
  },
}

export const NoDataYet: Story = {
  args: { lastUpdatedAt: null },
}
