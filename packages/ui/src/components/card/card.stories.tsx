import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const meta = {
  title: "base/card",
  component: Card,
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
