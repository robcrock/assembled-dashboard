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
  title: "atoms/table",
  component: Table,
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
