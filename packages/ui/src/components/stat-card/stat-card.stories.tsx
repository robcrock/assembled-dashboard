import type { Meta, StoryObj } from "@storybook/react-vite"

import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { Sparkline } from "@workspace/ui/components/sparkline"
import { StatCard } from "@workspace/ui/components/stat-card"

const ATTAINMENT_TREND = [97, 96, 95, 93, 90, 87, 84, 82, 84, 86]

const meta = {
  title: "molecules/stat-card",
  component: StatCard,
  parameters: {
    docs: {
      description: {
        component: `
Headline number + label, with a \`delta\` slot (a \`MetricDelta\`, beside the value) and a trend slot (\`children\`, e.g. a \`Sparkline\`, under it). Two presentations over one anatomy: \`variant: card | plain\` (standalone bordered card vs bare content for divider-separated KPI rows where the container owns the separation) and \`size: default | lg\` (dense-strip metric ramp vs overview hero counts — type scale only, same structure and states).

**The feed contract:** StatCard is a feed OWNER — it owns all four feed states internally. Consumers forward one \`feed\` object (\`{ status: "loading" | "live" | "stale" | "error", lastUpdatedAt?, onRetry? }\`, the store's value object) and never compose state visuals by hand: loading renders skeletons that mirror the final layout (no shift on resolve), error renders an \`ErrorState\` with retry, stale dims the value and appends a \`StaleIndicator\` — it never blanks — and a nullish \`value\` under a live feed renders a deliberate em dash. The leaf state primitives (Skeleton / ErrorState / StaleIndicator) are the visuals this owner renders, not something to wrap around it. StatCard never fetches — components below the template never do.

**Use it for:** any KPI/vital — a card in a summary strip, a divider row of sibling stats (\`plain\`), or an overview hero count (\`size="lg"\`).

**Not for:** navigation targets, or tinted "alarm cards" — alarm ink is the consumer's decision, carried by a tinted \`value\` node (e.g. breach ink only when it means a broken promise).

**Deliberately omitted:** a card-level color/status prop (a vital's alarm is its content — tinted cards would compete with the queue table); internal number formatting (\`value\` is a ReactNode — pass \`<Duration>\` etc.); navigation/onClick.
`,
      },
    },
  },
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

export const Empty: Story = {
  args: { label: "Tickets waiting" },
  parameters: {
    docs: {
      description: {
        story:
          "Deliberate empty: nullish value under a live feed renders an em dash.",
      },
    },
  },
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

export const StaleQuiet: Story = {
  args: {
    label: "Tickets waiting",
    value: "84",
    feed: { status: "stale", lastUpdatedAt: Date.now() - 42_000 },
    staleNote: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "`staleNote={false}`: the dim still marks the degradation, but the note is silenced — for pages whose chrome mounts the ONE canonical `StaleIndicator` (the dashboard does this: five identical notes said nothing five times).",
      },
    },
  },
}

export const PlainRow: Story = {
  args: { label: "", variant: "plain" },
  parameters: {
    docs: {
      description: {
        story:
          "Plain variant: divider-separated KPI row — the row owns the separation, so sibling stats take dividers instead of card chrome.",
      },
    },
  },
  render: () => (
    <div className="grid w-xl grid-cols-3">
      <StatCard
        variant="plain"
        className="pr-6"
        label="SLA attainment"
        value="86%"
      />
      <StatCard
        variant="plain"
        className="border-l px-6"
        label="Queues breaching"
        value="2"
      />
      <StatCard
        variant="plain"
        className="border-l pl-6"
        label="Tickets waiting"
        value="84"
      />
    </div>
  ),
}

export const SizeLg: Story = {
  args: {
    label: "Queues breaching",
    value: <span className="text-sla-breach">2</span>,
    variant: "plain",
    size: "lg",
    children: (
      <div className="text-metric-sm text-muted-foreground">
        1 at risk · 84 waiting
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Overview-band hero count: lg size, alarm ink carried by the value node (the ink decision is the consumer's — breach orange only when it means it).",
      },
    },
  },
}

// The one interactive story: every other state story couples its data to the
// state; this one holds FILLED data constant so flipping the control swaps
// only the state and any resolve-time layout shift becomes visible.
const PLAYGROUND_STATES = [
  "loading",
  "live",
  "stale",
  "error",
  "empty",
] as const

export const States: StoryObj<{ state: (typeof PLAYGROUND_STATES)[number] }> = {
  name: "States (playground)",
  argTypes: {
    state: { control: "select", options: [...PLAYGROUND_STATES] },
  },
  args: { state: "loading" },
  parameters: {
    docs: {
      description: {
        story:
          "Playground: flip `state` to watch the transitions in place — the sidebar state stories re-mount on every click, so only this control shows the reflow. The contract under test is **loading → live: no layout shift** (the skeleton mirrors the final anatomy). Stale *adding* its dated line and empty swapping to the em dash are designed differences, not shift bugs.",
      },
    },
  },
  render: ({ state }) => (
    <StatCard
      label="SLA attainment"
      value={state === "empty" ? undefined : "86%"}
      delta={state === "empty" ? undefined : <MetricDelta value={2} />}
      feed={
        state === "loading"
          ? { status: "loading" }
          : state === "error"
            ? { status: "error", onRetry: () => {} }
            : state === "stale"
              ? { status: "stale", lastUpdatedAt: Date.now() - 42_000 }
              : { status: "live" }
      }
    >
      {state === "empty" ? null : (
        <Sparkline
          points={ATTAINMENT_TREND}
          label="Attainment recovering from 82% to 86%"
        />
      )}
    </StatCard>
  ),
}

export const Strip: Story = {
  args: { label: "" },
  parameters: {
    docs: {
      description: {
        story: "Density: the summary strip shape — four vitals side by side.",
      },
    },
  },
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
