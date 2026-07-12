import type { Meta, StoryObj } from "@storybook/react-vite"

import { Skeleton } from "@workspace/ui/components/skeleton"

const meta = {
  title: "atoms/skeleton",
  component: Skeleton,
  parameters: {
    docs: {
      description: {
        component: `
Vendored shadcn/ui Skeleton on Base UI (style \`base-nova\`), kept as-shipped — as-shipped fidelity keeps upstream upgrades cheap. Don't fork it for domain needs; compose it.

In this system it backs every loading state: \`StatCard\`, \`DataTable\`, and \`OrgIdentity\` compose it into skeletons that mirror their final layout, so nothing shifts on resolve.

All colors route through semantic tokens (the pulse surface is \`muted\`); the Braun radius scale clamps its \`rounded-*\` utilities.
`,
      },
    },
  },
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
