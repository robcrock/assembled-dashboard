import type { Meta, StoryObj } from "@storybook/react-vite"

import { Duration } from "@workspace/ui/components/duration"

const meta = {
  title: "atoms/duration",
  component: Duration,
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

// Tabular figures: a ticking column keeps its width stable. text-metric
// carries no weight — the consumer chooses emphasis (bare here = the same
// normal weight table cells render).
export const Column: Story = {
  args: { seconds: 0 },
  render: () => (
    <div className="text-metric flex flex-col items-end gap-1">
      <Duration seconds={45} />
      <Duration seconds={90} />
      <Duration seconds={900} />
      <Duration seconds={1500} />
      <Duration seconds={3900} />
    </div>
  ),
}
