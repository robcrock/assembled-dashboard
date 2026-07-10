import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge } from "@workspace/ui/components/badge"

// The vendored shadcn Badge, across its variants. StatusBadge composes this.
const meta = {
  title: "base/badge",
  component: Badge,
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Badge" },
}

export const Secondary: Story = {
  args: { variant: "secondary", children: "Secondary" },
}

export const Destructive: Story = {
  args: { variant: "destructive", children: "Destructive" },
}

export const Outline: Story = {
  args: { variant: "outline", children: "Outline" },
}
