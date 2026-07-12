import type { Meta, StoryObj } from "@storybook/react-vite"

import { Duration } from "@workspace/ui/components/duration"

const meta = {
  title: "atoms/duration",
  component: Duration,
  parameters: {
    docs: {
      description: {
        component: `
Formats a seconds count as a human-readable duration inside a semantic \`<time>\` element (ISO-8601 \`dateTime\`), rendered with tabular figures so columns of durations never jitter.

**Use it for:** durations that arrive as data — \`state_duration_sec\`, \`out_of_adherence_sec\` — in dense table cells and stat lines.

**Not for:** wall-clock freshness ("updated 12s ago"). That is \`StaleIndicator\`, the page's only wall-clock surface.

**Deliberately omitted:** live ticking. Under replay, data time is compressed (5 fixture-minutes per tick), so a wall-clock ticker would disagree with every other number on screen — a Duration updates only when the data does.

Stateless leaf: it never owns feed states — loading/empty/error/stale live on the composing surface (\`StatCard\`, \`DataTable\`, sections).
`,
      },
    },
  },
} satisfies Meta<typeof Duration>

export default meta
type Story = StoryObj<typeof meta>

export const Seconds: Story = {
  args: { seconds: 45 },
}

export const MinutesAndSeconds: Story = {
  args: { seconds: 90 },
}

export const Minutes: Story = {
  args: { seconds: 1500 },
}

export const HoursAndMinutes: Story = {
  args: { seconds: 3900 },
}

export const Zero: Story = {
  args: { seconds: 0 },
}

export const Column: Story = {
  args: { seconds: 0 },
  parameters: {
    docs: {
      description: {
        story:
          "Tabular figures: a ticking column keeps its width stable. text-metric carries no weight — the consumer chooses emphasis (bare here = the same normal weight table cells render).",
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-end gap-1 text-metric">
      <Duration seconds={45} />
      <Duration seconds={90} />
      <Duration seconds={900} />
      <Duration seconds={1500} />
      <Duration seconds={3900} />
    </div>
  ),
}
