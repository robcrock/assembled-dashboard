import type { Meta, StoryObj } from "@storybook/react-vite"

import { Gauge } from "@workspace/ui/components/gauge"
import { MetricDelta } from "@workspace/ui/components/metric-delta"

// Leaf visual: loading/empty/error/stale are owned by the surface composing
// it, so the states here are the value space plus the center slot. The gauge
// owns only the arc — every figure in the center arrives via children.
const meta = {
  title: "atoms/gauge",
  component: Gauge,
} satisfies Meta<typeof Gauge>

export default meta
type Story = StoryObj<typeof meta>

// The dashboard's shape: big figure + delta + caption in the center slot.
export const Reading: Story = {
  args: {
    value: 86,
    label: "SLA attainment 86%",
    children: (
      <>
        <div className="text-metric-xl">86%</div>
        <MetricDelta value={2} unit="pp" />
        <div className="text-muted-foreground text-xs font-medium">
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

// Zero renders track only — a zero-length arc with round caps would read as a dot.
export const Zero: Story = {
  args: {
    value: 0,
    label: "SLA attainment 0%",
    children: <div className="text-metric-xl">0%</div>,
  },
}

// No center content: the arc alone, for consumers that annotate elsewhere.
export const BareArc: Story = {
  args: { value: 62, label: "Utilization 62%" },
}
