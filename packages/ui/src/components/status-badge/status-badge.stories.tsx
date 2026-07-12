import type { Meta, StoryObj } from "@storybook/react-vite"

import { StatusBadge, StatusDot } from "@workspace/ui/components/status-badge"

const meta = {
  title: "components/molecules/status-badge",
  component: StatusBadge,
  parameters: {
    docs: {
      description: {
        component: `
The canonical status surface: one \`status\` value (a five-value union covering both scales of the domain language — SLA \`healthy | at_risk | breached\` and adherence \`adherent | out_of_adherence\`) becomes glyph + label + tint through the single \`STATUS_META\` map. \`StatusDot\` renders the standalone glyph. Status reads by **icon shape first, color second** — the palette's loud accent is reserved for a broken promise (SLA breach and out-of-adherence, which share it by design).

**Use it for:** any surface stating a status *verdict* — table cells, row labels, legends. \`children\` render extra detail after the canonical label (e.g. "· 55s over") — they augment the label, never replace it, so status always stays textual. To tint *other* primitives from the same canonical map, use the exported \`statusTextClass\` / \`statusFillClass\` helpers rather than hand-picking colors.

**Not for:** deltas or indicators that aren't verdicts (\`MetricDelta\` is deliberately colorless); ad-hoc colored labels.

**Deliberately omitted:** color/variant props — the canonical mapping isn't per-call negotiable; \`className\` is merged *before* the tint, so it can adjust layout but can never re-tint a status surface. Also no size prop and no onClick.
`,
      },
    },
  },
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

export const WithDetail: Story = {
  args: {
    status: "breached",
    children: <span>· 55s over</span>,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Detail suffix: children augment the canonical label, never replace it. Full-alpha ink deliberately: dimming tinted text stacks opacity on color, which crushes contrast — the middot already de-emphasizes.",
      },
    },
  },
}

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
  parameters: {
    docs: {
      description: {
        story:
          "Standalone dots: each glyph carries an sr-only label so status stays audible without adjacent text.",
      },
    },
  },
}

export const DotWithText: Story = {
  args: { status: "breached" },
  render: () => (
    <div className="flex items-center gap-2 text-sm text-foreground">
      <StatusDot status="breached" decorative />
      Billing
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Decorative dot: adjacent text already names the status, so `decorative` suppresses the sr-only label and AT doesn't hear it twice.",
      },
    },
  },
}

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
          <span className="text-sm text-foreground">{queue}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Density: the triage cluster as it appears in a dashboard row.",
      },
    },
  },
}
