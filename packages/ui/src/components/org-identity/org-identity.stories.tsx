import type { Meta, StoryObj } from "@storybook/react-vite"

import { OrgIdentity } from "@workspace/ui/components/org-identity"

const meta = {
  title: "molecules/org-identity",
  component: OrgIdentity,
} satisfies Meta<typeof OrgIdentity>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {
  args: {
    name: "Northwind Support",
    tagline: "Floor status — real-time operations.",
  },
}

// null name: skeletons mirror the final layout, so nothing shifts on resolve.
export const Loading: Story = {
  args: {
    name: null,
    tagline: "Floor status — real-time operations.",
  },
}

// The name truncates rather than wrapping — tenant names are data, not copy.
export const LongName: Story = {
  args: {
    name: "Amalgamated Consolidated Intergalactic Support Cooperative",
    tagline: "Floor status — real-time operations.",
  },
  render: (args) => (
    <div className="w-80">
      <OrgIdentity {...args} />
    </div>
  ),
}
