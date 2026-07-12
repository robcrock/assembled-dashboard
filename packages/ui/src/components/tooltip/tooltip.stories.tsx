import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

const meta = {
  title: "atoms/tooltip",
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component: `
Vendored shadcn/ui Tooltip on Base UI (style \`base-nova\`), kept as-shipped with its full stock surface even where unused — as-shipped fidelity keeps upstream upgrades cheap. Don't fork it for domain needs; compose it.

No component composes it yet — it sits in the catalog awaiting a consumer (dense dashboard surfaces prefer information visible at rest over hover reveals).

All colors route through semantic tokens; the Braun radius scale clamps its \`rounded-*\` utilities.
`,
      },
    },
  },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Hover me
        </TooltipTrigger>
        <TooltipContent>Tooltip content</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}
