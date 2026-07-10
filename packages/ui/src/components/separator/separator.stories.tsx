import type { Meta, StoryObj } from "@storybook/react-vite"

import { Separator } from "@workspace/ui/components/separator"

const meta = {
  title: "base/separator",
  component: Separator,
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <div className="w-56 text-sm">
      Above
      <Separator className="my-2" />
      Below
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-6 items-center gap-2 text-sm">
      Left
      <Separator orientation="vertical" />
      Right
    </div>
  ),
}
