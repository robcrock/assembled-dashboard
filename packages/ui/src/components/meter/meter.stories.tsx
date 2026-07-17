import type { Meta, StoryObj } from "@storybook/react-vite"

import { Meter } from "@workspace/ui/components/meter"

const meta = {
  title: "components/atoms/meter",
  component: Meter,
  parameters: {
    docs: {
      description: {
        component: `
A normalized 0→max fill against a bound — the **saturation** reading.

**Use it for:** "how full is this against its limit" — bounded-fill readings. Tint comes only from the canonical status scale (\`statusFillClass\`) via \`status\`; neutral when omitted — so meters can never invent a fourth severity color or drift from the badges. Its dashboard consumer: the overview's SLA-attainment tile renders attainment-toward-100% as the tile's bottom fill line, neutral/untinted (a reading, not a verdict).

**Not for:**
- Signed distance from a target — \`DeviationBar\` (Meter answers saturation, not distance-from-target).
- Per-tick threshold crossings over time — \`SparkBars\`.
- Trend shape over time — \`SparkBars\`.
- One normalized hero reading — \`Gauge\`.

**Deliberately omitted:** magnitude labels — overflow (\`value > max\`) caps the fill at 100%; the meter shows saturation, and the number that says HOW far over rides beside it in a \`MetricDelta\`. Also any fourth severity color.

Stateless leaf: it never owns feed states — loading/empty/error/stale live on the composing surface (\`StatCard\`, \`DataTable\`, sections).
`,
      },
    },
  },
} satisfies Meta<typeof Meter>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {
  args: { value: 45, max: 100, label: "Utilization" },
}

export const Healthy: Story = {
  args: {
    value: 370,
    max: 1800,
    label: "Onboarding SLA target consumed",
    status: "healthy",
  },
}

export const AtRisk: Story = {
  args: {
    value: 250,
    max: 300,
    label: "VIP SLA target consumed",
    status: "at_risk",
  },
}

export const BreachedOverflow: Story = {
  args: {
    value: 175,
    max: 120,
    label: "Billing SLA target consumed",
    status: "breached",
  },
  parameters: {
    docs: {
      description: {
        story:
          "value > max: the fill caps at 100% — magnitude belongs to a MetricDelta beside it.",
      },
    },
  },
}

export const EmptyFill: Story = {
  args: { value: 0, max: 100, label: "No wait", status: "healthy" },
}

export const Density: Story = {
  args: { value: 45, max: 100, label: "Utilization" },
  parameters: {
    docs: {
      description: {
        story:
          "Density: meters stacked at table-row rhythm, as they'd sit in a queue-table column.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-2">
      <Meter value={175} max={120} label="Billing" status="breached" />
      <Meter value={172} max={120} label="Chat" status="breached" />
      <Meter value={250} max={300} label="VIP" status="at_risk" />
      <Meter value={230} max={600} label="Tier 2" status="healthy" />
      <Meter value={370} max={1800} label="Onboarding" status="healthy" />
    </div>
  ),
}
