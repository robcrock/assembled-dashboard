import type { Meta, StoryObj } from "@storybook/react-vite"

import { Gauge } from "@workspace/ui/components/gauge"
import { MetricDelta } from "@workspace/ui/components/metric-delta"

const meta = {
  title: "components/atoms/gauge",
  component: Gauge,
  parameters: {
    docs: {
      description: {
        component: `
A single normalized value (0–100) as an open-bottom arc (~240° sweep) — the "how are we doing overall" **hero reading**. (Catalog primitive: the dashboard's overview replaced the arc with an attainment tile — StatCard + a \`Meter\` fill line — to match the KPI band's rhythm; the Gauge is kept deliberately, awaiting a hero-reading consumer.)

**Use it for:** one headline reading, with the big figure, delta, and caption composed into the center slot via \`children\` — the gauge owns ONLY the arc and never formats numbers.

**Not for:**
- Row-density trends — \`Sparkline\` (shape over time) or \`SparkBars\` (per-tick threshold crossings).
- Saturation against a bound at row size — \`Meter\`.
- Signed distance from a target — \`DeviationBar\`.
- Verdicts — the gauge is a reading, not a verdict; verdict color stays on the status surfaces.

**Deliberately omitted:**
- Internal number formatting — every figure in the center arrives via \`children\`.
- Gradient, threshold zones, needle — tokens only: muted track, \`currentColor\` value arc (foreground by default).
- Animation.

Stateless leaf: loading/empty/error/stale are owned by the surface composing it — the states worth cataloguing here are the value space plus the center slot.
`,
      },
    },
  },
} satisfies Meta<typeof Gauge>

export default meta
type Story = StoryObj<typeof meta>

export const Reading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The dashboard's shape: big figure + delta + caption in the center slot.",
      },
    },
  },
  args: {
    value: 86,
    label: "SLA attainment 86%",
    children: (
      <>
        <div className="text-metric-xl">86%</div>
        <MetricDelta value={2} unit="pp" />
        <div className="text-xs font-medium text-muted-foreground">
          SLA attainment
        </div>
      </>
    ),
  },
}

export const Low: Story = {
  args: {
    value: 12,
    label: "SLA attainment 12%",
    children: <div className="text-metric-xl">12%</div>,
  },
}

export const Full: Story = {
  args: {
    value: 100,
    label: "SLA attainment 100%",
    children: <div className="text-metric-xl">100%</div>,
  },
}

export const Zero: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Zero renders track only — a zero-length arc with round caps would read as a dot.",
      },
    },
  },
  args: {
    value: 0,
    label: "SLA attainment 0%",
    children: <div className="text-metric-xl">0%</div>,
  },
}

export const BareArc: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "No center content: the arc alone, for consumers that annotate elsewhere.",
      },
    },
  },
  args: { value: 62, label: "Utilization 62%" },
}
