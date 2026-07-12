import type { Meta, StoryObj } from "@storybook/react-vite"

import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { Sparkline } from "@workspace/ui/components/sparkline"
import { StatCard } from "@workspace/ui/components/stat-card"

const ATTAINMENT_TREND = [97, 96, 95, 93, 90, 87, 84, 82, 84, 86]

const meta = {
  title: "molecules/stat-card",
  component: StatCard,
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {
  args: { label: "Tickets waiting", value: "84" },
}

export const WithDelta: Story = {
  args: {
    label: "SLA attainment",
    value: "86%",
    delta: <MetricDelta value={2} />,
  },
}

export const WithTrend: Story = {
  args: {
    label: "SLA attainment",
    value: "86%",
    delta: <MetricDelta value={2} />,
    children: (
      <Sparkline
        points={ATTAINMENT_TREND}
        label="Attainment recovering from 82% to 86%"
      />
    ),
  },
}

export const ForecastDelta: Story = {
  args: {
    label: "Volume vs forecast",
    value: "+25%",
    delta: <MetricDelta value={25} />,
  },
}

export const Loading: Story = {
  args: {
    label: "Tickets waiting",
    feed: { status: "loading" },
    children: <Sparkline points={ATTAINMENT_TREND} />,
  },
}

// Deliberate empty: nullish value under a live feed renders an em dash.
export const Empty: Story = {
  args: { label: "Tickets waiting" },
}

export const Error: Story = {
  args: {
    label: "Tickets waiting",
    feed: { status: "error", onRetry: () => {} },
  },
}

export const Stale: Story = {
  args: {
    label: "Tickets waiting",
    value: "84",
    feed: { status: "stale", lastUpdatedAt: Date.now() - 42_000 },
  },
}

// Plain variant: divider-separated KPI row — the row owns the separation,
// so sibling stats take dividers instead of card chrome.
export const PlainRow: Story = {
  args: { label: "", variant: "plain" },
  render: () => (
    <div className="grid w-xl grid-cols-3">
      <StatCard variant="plain" className="pr-6" label="SLA attainment" value="86%" />
      <StatCard variant="plain" className="border-l px-6" label="Queues breaching" value="2" />
      <StatCard variant="plain" className="border-l pl-6" label="Tickets waiting" value="84" />
    </div>
  ),
}

// Overview-band hero count: lg size, alarm ink carried by the value node
// (the ink decision is the consumer's — breach red only when it means it).
export const SizeLg: Story = {
  args: {
    label: "Queues breaching",
    value: <span className="text-sla-breach">2</span>,
    variant: "plain",
    size: "lg",
    children: (
      <div className="text-muted-foreground text-metric-sm">
        1 at risk · 84 waiting
      </div>
    ),
  },
}

// Density: the summary strip shape — four vitals side by side.
export const Strip: Story = {
  args: { label: "" },
  render: () => (
    <div className="flex gap-3">
      <StatCard
        label="SLA attainment"
        value="86%"
        delta={<MetricDelta value={2} />}
      >
        <Sparkline points={ATTAINMENT_TREND} />
      </StatCard>
      <StatCard label="Queues breaching" value="2" />
      <StatCard label="Tickets waiting" value="84" />
      <StatCard
        label="Out of adherence"
        value="3"
        delta={<MetricDelta value={1} />}
      />
    </div>
  ),
}
