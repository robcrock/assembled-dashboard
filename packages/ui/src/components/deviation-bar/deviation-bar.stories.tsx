import type { Meta, StoryObj } from "@storybook/react-vite"

import { DeviationBar } from "@workspace/ui/components/deviation-bar"

const meta = {
  title: "components/atoms/deviation-bar",
  component: DeviationBar,
  parameters: {
    docs: {
      description: {
        component: `
A **signed deviation around a center baseline dot** (the target): positive extends right ("crossed past the promise"), negative extends left. The sign IS the direction.

**Use it for:** how far a value sits over or under its target — the queue table's headroom and volume-vs-forecast cells — with the exact figure riding beside it (e.g. a \`MetricDelta\`).

**Not for:**
- Saturation against a bound — \`Meter\` (different question: DeviationBar is signed distance-from-target, Meter is a normalized 0→max fill).
- Per-tick threshold crossings over time — \`SparkBars\`.
- Trend shape — \`Sparkline\`.
- One normalized hero reading — \`Gauge\`.

**Deliberately omitted:**
- Color, entirely — one neutral muted fill, no status tint: the bar shows direction + proportion, and any verdict lives on the status surfaces beside it (badges), never here.
- A direction/\`invert\` prop — the sign already is the direction.
- A rendered number — the exact figure rides beside it, never inside.
- Threshold markers.

\`range\` clamps each half: deviations past ±range render a full half (proportion, not magnitude).

Stateless leaf: loading/empty/error/stale are owned by the surface composing it (\`DataTable\`, \`StatCard\`) — the states worth cataloguing here are the value space: over, under, at baseline, clamped.
`,
      },
    },
  },
} satisfies Meta<typeof DeviationBar>

export default meta
type Story = StoryObj<typeof meta>

export const Over: Story = {
  args: {
    value: 46,
    label: "Billing: longest wait 2m 55s against a 2m target",
  },
  parameters: {
    docs: {
      description: {
        story: "Over target: the bar crosses RIGHT past the baseline dot.",
      },
    },
  },
}

export const Under: Story = {
  args: {
    value: -79,
    label: "Onboarding: longest wait 6m 10s against a 30m target",
  },
  parameters: {
    docs: {
      description: {
        story: "Under target: headroom remaining extends left.",
      },
    },
  },
}

export const Zero: Story = {
  args: { value: 0, label: "Wait exactly at target" },
  parameters: {
    docs: {
      description: {
        story: "Exactly at the target: no fill, just the baseline dot.",
      },
    },
  },
}

export const ClampedOverflow: Story = {
  args: {
    value: 150,
    label: "Longest wait 150% over target",
  },
  parameters: {
    docs: {
      description: {
        story:
          "value past ±range caps at a full half — proportion, not magnitude.",
      },
    },
  },
}

export const ForecastRange: Story = {
  args: {
    value: 25,
    range: 50,
    label: "Volume 25% over forecast",
  },
  parameters: {
    docs: {
      description: {
        story:
          "range doing real work: forecast deviations live in ±50-ish territory, so a tighter range keeps a +25% overage legible instead of a sliver.",
      },
    },
  },
}

export const Density: Story = {
  args: { value: 46, label: "Billing" },
  parameters: {
    docs: {
      description: {
        story:
          "Density: the queue table's headroom column — the fixture's six queues.",
      },
    },
  },
  render: () => (
    <div className="flex w-24 flex-col gap-2">
      <DeviationBar value={46} label="Billing" />
      <DeviationBar value={44} label="Chat" />
      <DeviationBar value={-17} label="VIP" />
      <DeviationBar value={-37} label="Tier 2" />
      <DeviationBar value={-62} label="General" />
      <DeviationBar value={-79} label="Onboarding" />
    </div>
  ),
}
