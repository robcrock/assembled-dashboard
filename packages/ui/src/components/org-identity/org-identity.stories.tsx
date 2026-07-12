import type { Meta, StoryObj } from "@storybook/react-vite"

import { OrgIdentity } from "@workspace/ui/components/org-identity"

const meta = {
  title: "components/molecules/org-identity",
  component: OrgIdentity,
  parameters: {
    docs: {
      description: {
        component: `
Whitelabel identity block: a monogram tile derived from \`name\`'s first character, the name rendered as the page's \`<h1>\`, and a muted \`tagline\` — all wrapped in an \`aria-label="Homepage"\` link (\`href\` defaults to "/").

Identity is DATA, never hardcoded branding: \`name: null\` renders skeletons that mirror the final layout, so identity resolves without shift when the first payload lands. Long names truncate rather than wrap — tenant names are data, not copy.

**Use it for:** the block that anchors a whitelabel page's header — exactly one per page, because the name IS the h1.

**Not for:** secondary brand marks, nav items, or anywhere needing a different heading level — an identity block anchors exactly one page; wanting an h2 here means this is the wrong component.

**Deliberately omitted:** logo upload (the monogram derives from the name — identity is data in a whitelabel system); a size prop (single consumer scale); a heading-level choice.
`,
      },
    },
  },
} satisfies Meta<typeof OrgIdentity>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {
  args: {
    name: "Northwind Support",
    tagline: "Floor status — real-time operations.",
  },
}

export const Loading: Story = {
  args: {
    name: null,
    tagline: "Floor status — real-time operations.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "null name: skeletons mirror the final layout, so nothing shifts on resolve.",
      },
    },
  },
}

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
  parameters: {
    docs: {
      description: {
        story:
          "The name truncates rather than wrapping — tenant names are data, not copy.",
      },
    },
  },
}
