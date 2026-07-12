import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"

const meta = {
  title: "atoms/button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component: `
Vendored shadcn/ui Button on Base UI (style \`base-nova\`), kept as-shipped with its full stock variant surface even where unused — as-shipped fidelity keeps upstream upgrades cheap. Don't fork it for domain needs; compose it.

In this system it is composed by \`ErrorState\` (the retry affordance) and \`ThemeToggle\` in the library, and by the dashboard template's demo controls (pause replay / inject error) in the app.

All colors route through semantic tokens; the Braun radius scale clamps its \`rounded-*\` utilities.
`,
      },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Button" },
}

export const Variants: Story = {
  args: { children: "Button" },
  render: () => (
    <div className="flex items-center gap-2">
      <Button>Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
}
