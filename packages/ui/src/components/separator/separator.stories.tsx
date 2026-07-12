import type { Meta, StoryObj } from "@storybook/react-vite"

import { Separator } from "@workspace/ui/components/separator"

const meta = {
  title: "atoms/separator",
  component: Separator,
  parameters: {
    docs: {
      description: {
        component: `
Vendored shadcn/ui Separator on Base UI (style \`base-nova\`), kept as-shipped with both orientations even where unused — as-shipped fidelity keeps upstream upgrades cheap. Don't fork it for domain needs; compose it.

No component composes it yet — it sits in the catalog awaiting a consumer (dividers in the app currently fall out of border utilities on layout containers).

All colors route through semantic tokens (the rule is \`border\`).
`,
      },
    },
  },
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
