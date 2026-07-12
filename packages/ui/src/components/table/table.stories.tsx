import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

const meta = {
  title: "components/atoms/table",
  component: Table,
  parameters: {
    docs: {
      description: {
        component: `
Vendored shadcn/ui Table on Base UI (style \`base-nova\`), kept as-shipped with its full stock part surface (header, body, footer, caption) even where unused — as-shipped fidelity keeps upstream upgrades cheap. Don't fork it for domain needs; compose it.

In this system it is composed by \`DataTable\`, which layers sorting, keyboard navigation, expandable rows, and the feed states on top of these parts.

All colors route through semantic tokens; the Braun radius scale clamps its \`rounded-*\` utilities.
`,
      },
    },
  },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[
          ["Alpha", "12"],
          ["Beta", "7"],
          ["Gamma", "31"],
        ].map(([name, value]) => (
          <TableRow key={name}>
            <TableCell>{name}</TableCell>
            <TableCell className="text-right">{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}
