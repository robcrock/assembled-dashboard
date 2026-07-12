import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  StatusBadge,
  StatusDot,
} from "@workspace/ui/components/status-badge"

const meta = {
  title: "molecules/status-badge",
  component: StatusBadge,
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

// --- SLA statuses ---

export const Healthy: Story = {
  args: { status: "healthy" },
}

export const AtRisk: Story = {
  args: { status: "at_risk" },
}

export const Breached: Story = {
  args: { status: "breached" },
}

// --- Adherence statuses ---

export const Adherent: Story = {
  args: { status: "adherent" },
}

export const OutOfAdherence: Story = {
  args: { status: "out_of_adherence" },
}

// --- Detail suffix: children augment the canonical label, never replace it.
// Full-alpha ink deliberately: dimming tinted text stacks opacity on color,
// which crushes contrast — the middot already de-emphasizes. ---

export const WithDetail: Story = {
  args: {
    status: "breached",
    children: <span>· 55s over</span>,
  },
}

// --- Dots: standalone (sr-only label) and decorative (adjacent text) ---

export const Dots: Story = {
  args: { status: "healthy" },
  render: () => (
    <div className="flex items-center gap-3">
      <StatusDot status="healthy" />
      <StatusDot status="at_risk" />
      <StatusDot status="breached" />
      <StatusDot status="adherent" />
      <StatusDot status="out_of_adherence" />
    </div>
  ),
}

export const DotWithText: Story = {
  args: { status: "breached" },
  render: () => (
    <div className="text-foreground flex items-center gap-2 text-sm">
      <StatusDot status="breached" decorative />
      Billing
    </div>
  ),
}

// --- Density: the triage cluster as it appears in a dashboard row ---

export const Density: Story = {
  args: { status: "healthy" },
  render: () => (
    <div className="flex flex-col gap-2">
      {(
        [
          ["breached", "Billing"],
          ["breached", "Live Chat"],
          ["at_risk", "VIP"],
          ["healthy", "Tier 2"],
          ["healthy", "Onboarding"],
          ["healthy", "General"],
        ] as const
      ).map(([status, queue]) => (
        <div key={queue} className="flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-foreground text-sm">{queue}</span>
        </div>
      ))}
    </div>
  ),
}
