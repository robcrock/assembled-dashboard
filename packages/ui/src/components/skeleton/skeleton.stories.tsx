import type { Meta, StoryObj } from "@storybook/react-vite"

import { Skeleton } from "@workspace/ui/components/skeleton"

const meta = {
  title: "primitives/skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex w-56 flex-col gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-40" />
    </div>
  ),
}
