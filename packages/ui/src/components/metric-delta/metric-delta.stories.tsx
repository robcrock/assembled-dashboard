import type { Meta, StoryObj } from "@storybook/react-vite"

import { MetricDelta } from "@workspace/ui/components/metric-delta"

const meta = {
  title: "components/atoms/metric-delta",
  component: MetricDelta,
  parameters: {
    docs: {
      description: {
        component: `
A signed value plus unit, rendered as a colorless, glyph-free annotation in muted ink. Pass the raw signed number — the component owns the +/− sign, so every delta on the page reads identically.

**Use it for:** how far a number sits from its target or forecast, riding beside the number it annotates (StatCard deltas, the queue table's headroom and volume percents, the Gauge's center slot).

**Not for:** verdicts. Whether a move is good or bad already lives on the status surfaces (\`StatusBadge\`, the \`Sparkline\` tint) — never on the delta.

**Deliberately omitted:**
- Color — deltas are annotations, not verdicts; the palette's one loud accent stays reserved for SLA breach. No exceptions: even the queue table's headroom percent stays neutral.
- Direction arrows/glyphs — the explicit +/− sign already carries direction.
- An \`invert\` prop — with no color there is no good/bad to flip.
- Pre-formatted strings — the component formats the raw signed value so signing can't drift per call site.

Stateless leaf: it never owns feed states — loading/empty/error/stale live on the composing surface (\`StatCard\`, \`DataTable\`, sections).
`,
      },
    },
  },
} satisfies Meta<typeof MetricDelta>

export default meta
type Story = StoryObj<typeof meta>

export const Up: Story = {
  args: { value: 4 },
  parameters: {
    docs: {
      description: {
        story:
          "Deltas are colorless, glyph-free annotations: the explicit +/− sign carries direction, and good/bad verdicts belong to the status surfaces (badges).",
      },
    },
  },
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

export const Density: Story = {
  args: { value: 0 },
  parameters: {
    docs: {
      description: {
        story:
          "Density: a column of deltas stays quiet — tabular figures, no color noise.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-end gap-1">
      <MetricDelta value={25} />
      <MetricDelta value={-8} />
      <MetricDelta value={0} />
      <MetricDelta value={3} />
      <MetricDelta value={-12} />
    </div>
  ),
}
