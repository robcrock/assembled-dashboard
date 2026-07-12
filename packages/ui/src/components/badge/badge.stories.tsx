import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge } from "@workspace/ui/components/badge"

const meta = {
  title: "atoms/badge",
  component: Badge,
  parameters: {
    docs: {
      description: {
        component: `
Vendored shadcn/ui Badge on Base UI (style \`base-nova\`), kept as-shipped with its full stock variant surface even where unused — as-shipped fidelity keeps upstream upgrades cheap. Don't fork it for domain needs; compose it.

In this system it is composed by \`StatusBadge\`, via \`variant="outline"\` + \`border-transparent\` — no stock variant takes a status-parameterized tint (\`destructive\` is tinted but hard-wired to the action color).

All colors route through semantic tokens, and the Braun radius scale clamps its \`rounded-*\` utilities: the stock \`rounded-4xl\` pill renders as a 4px chip.

Known deviation (see system/brand): the stock \`destructive\` variant's ink-on-own-tint pairing measures 4.09:1 over the page concrete — under AA, unshipped by any consumer, and kept stock rather than forked. The system's shipping status surfaces are AA-solved.
`,
      },
    },
  },
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
