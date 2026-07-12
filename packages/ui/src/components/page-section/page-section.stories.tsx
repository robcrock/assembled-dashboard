import type { Meta, StoryObj } from "@storybook/react-vite"

import { PageSection } from "@workspace/ui/components/page-section"

const meta = {
  title: "molecules/page-section",
  component: PageSection,
  parameters: {
    docs: {
      description: {
        component: `
The page's section shell: a labelled \`<section>\` with the canonical heading block (h2 + muted description) above whatever the section holds. Extracted because every dashboard section repeats this exact anatomy — one component keeps the heading hierarchy and the aria wiring from drifting.

**A11y contract (the reason it exists):** \`id\` wires the anatomy — the heading renders with \`\${id}-heading\` and the \`<section>\` points at it via \`aria-labelledby\`, so every section is a named landmark for assistive tech. The heading level is FIXED at h2: sections sit under the page's single h1 (the \`OrgIdentity\` name). No margins baked in — the call site's stack owns spacing between sections.

**Use it for:** every labelled region of a page that sits directly under the h1.

**Not for:** sub-sections needing h3 and below, or standalone cards — needing a different heading level means this is the wrong component.

**Deliberately omitted:** a heading-level prop (h2 is the page anatomy under the single h1); an actions slot (unearned until a second consumer needs it); baked-in margins; collapse behavior.
`,
      },
    },
  },
} satisfies Meta<typeof PageSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    id: "queues",
    title: "Queues",
    description:
      "Sorted by severity against each queue's own target — expand a row to see who can help.",
    children: (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        section content
      </div>
    ),
  },
}

export const NoDescription: Story = {
  args: {
    id: "agents",
    title: "Agents needing attention",
    children: (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        section content
      </div>
    ),
  },
}
