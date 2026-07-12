import type { Meta, StoryObj } from "@storybook/react-vite"

import { Callout } from "@workspace/ui/components/callout"

const meta = {
  title: "atoms/callout",
  component: Callout,
  parameters: {
    docs: {
      description: {
        component: `
A quiet contextual aside — a hairline left rule and muted small text. The chrome for caveats and shared context that sits beside data: the coverage panel's shared-capacity note is its consumer.

**Use it for:** one-clause context a reader should notice but never mistake for data or an alarm ("shared capacity: pulling an agent here drains the queues they also cover").

**Not for:**
- Verdicts or warnings — a callout that wants a status color is a status surface wearing the wrong clothes; \`StatusBadge\` / \`ErrorState\` own those.
- Feed states — \`EmptyState\` / \`ErrorState\` are the state visuals.
- Titled content regions — that's \`PageSection\`.

**Deliberately omitted:** status/variant tints (context, not alarm — the one loud color stays reserved for breach); an icon slot (the rule IS the affordance); a title prop (single-clause notes; a titled panel is a different component); dismissal (context should stay put).

Stateless leaf: it never owns feed states.
`,
      },
    },
  },
} satisfies Meta<typeof Callout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children:
      "Shared capacity: pulling an agent here drains the queues they also cover.",
  },
}

export const MultiLine: Story = {
  args: {
    children:
      "Forecasts refresh every 15 minutes from the workforce model. Intraday reforecasts land on the hour; anything between ticks is interpolated, so brief gaps against the schedule are expected.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Longer context wraps under the same rule — the hairline spans the full note.",
      },
    },
  },
}

export const BesideData: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex w-96 flex-col gap-3 text-sm">
      <ul className="flex flex-col gap-1">
        <li className="flex items-baseline justify-between">
          <span className="font-medium">Jordan P.</span>
          <span className="text-muted-foreground">On break · 15m out</span>
        </li>
        <li className="flex items-baseline justify-between">
          <span className="font-medium">Devin K.</span>
          <span className="text-muted-foreground">On a call · 45m</span>
        </li>
      </ul>
      <Callout>
        Shared capacity: pulling an agent here drains the queues they also
        cover.
      </Callout>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The intended composition: a quiet note anchoring a data list, visually subordinate to the rows above it.",
      },
    },
  },
}
