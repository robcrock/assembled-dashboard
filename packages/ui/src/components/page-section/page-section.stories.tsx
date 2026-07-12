import type { Meta, StoryObj } from "@storybook/react-vite"

import { PageSection } from "@workspace/ui/components/page-section"

const meta = {
  title: "molecules/page-section",
  component: PageSection,
} satisfies Meta<typeof PageSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    id: "queues",
    title: "Queues",
    description:
      "Sorted by severity against each queue's own target — expand a row to see who can help.",
    children: (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        section content
      </div>
    ),
  },
}

export const NoDescription: Story = {
  args: {
    id: "agents",
    title: "Agents needing attention",
    children: (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        section content
      </div>
    ),
  },
}
