import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const meta = {
  title: "components/atoms/card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component: `
Vendored shadcn/ui Card on Base UI (style \`base-nova\`), kept as-shipped with its full stock part surface (header, description, action, footer) even where unused — as-shipped fidelity keeps upstream upgrades cheap. Don't fork it for domain needs; compose it.

In this system it is composed by \`StatCard\`'s \`card\` variant, which wraps its metric anatomy in \`Card size="sm"\`.

All colors route through semantic tokens; the Braun radius scale clamps its \`rounded-*\` utilities.
`,
      },
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>Supporting description text.</CardDescription>
      </CardHeader>
      <CardContent>Card content.</CardContent>
    </Card>
  ),
}

export const Small: Story = {
  render: () => (
    <Card size="sm" className="w-72">
      <CardHeader>
        <CardTitle>Small card</CardTitle>
      </CardHeader>
      <CardContent>Denser spacing via size=&quot;sm&quot;.</CardContent>
    </Card>
  ),
}
