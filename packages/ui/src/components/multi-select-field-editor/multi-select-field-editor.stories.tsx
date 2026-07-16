import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import type { EnumOption } from "@workspace/ui/components/enum-select"
import { MultiSelectFieldEditor } from "@workspace/ui/components/multi-select-field-editor"

const meta = {
  title: "components/atoms/multi-select-field-editor",
  component: MultiSelectFieldEditor,
  parameters: {
    docs: {
      description: {
        component: `
The edit face of a membership list (\`string[]\`) — the editor a \`multiselect\` column type resolves to. The dashboard's consumer is an agent's queue skills. Composes the vendored \`Select\` in Base UI's \`multiple\` mode: the popup stays open across picks, each pick toggles membership.

The commit grammar shifts accordingly: where \`EnumSelect\` treats a pick as the intent, here **closing the picker is the intent** — any close commits the draft, except an **Escape close, which cancels**. A container that wanted to batch would simply omit both callbacks, per the shared contract.

The trigger summarizes: up to two labels verbatim, then a count ("3 selected") — a cell-width control, not a chip garden.

**Use it for:** membership in a short, closed set — which queues an agent covers.

**Not for:**
- One-of-N — \`EnumSelect\`.
- Long or searchable sets, tagging with free entry — unearned here.

**Deliberately omitted:** chips with per-item remove buttons (removal is re-toggling the item in the list — one interaction instead of two to learn); a select-all affordance (these sets are 3–6 options); ordering semantics (membership is a set, not a ranking); commit buttons (commit-policy-agnostic, like every editor).

Stateless leaf: the draft lives in the container; it never owns feed states. Options are often dynamic domain data — the container threads them in the same way the app threads \`queueNamesById\`.
`,
      },
    },
  },
} satisfies Meta<typeof MultiSelectFieldEditor>

export default meta
type Story = StoryObj<typeof meta>

const QUEUE_OPTIONS: readonly EnumOption<string>[] = [
  { value: "billing", label: "Billing" },
  { value: "chat", label: "Chat" },
  { value: "vip", label: "VIP" },
  { value: "tier_2", label: "Tier 2" },
  { value: "onboarding", label: "Onboarding" },
  { value: "general", label: "General" },
]

/** Stories control the draft locally so toggling works in the canvas. */
function Controlled(props: {
  initial: string[]
  invalid?: boolean
  disabled?: boolean
}) {
  const [value, setValue] = useState<string[]>(props.initial)
  const [note, setNote] = useState<string | null>(null)
  return (
    <div className="flex w-56 flex-col gap-2">
      <MultiSelectFieldEditor
        value={value}
        onChange={(next) => {
          setValue(next)
          setNote(null)
        }}
        onCommit={(draft) => setNote(`committed ${draft.length} queue(s)`)}
        onCancel={() => {
          setValue(props.initial)
          setNote("cancelled — draft reverted")
        }}
        options={QUEUE_OPTIONS}
        invalid={props.invalid}
        disabled={props.disabled}
        placeholder="Assign queues…"
        aria-label="Queues covered"
      />
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {note ?? "closing commits · Escape cancels"}
      </p>
    </div>
  )
}

export const Default: Story = {
  args: {
    value: ["billing", "tier_2"],
    onChange: () => {},
    options: QUEUE_OPTIONS,
  },
  render: () => <Controlled initial={["billing", "tier_2"]} />,
  parameters: {
    docs: {
      description: {
        story:
          "Two memberships render verbatim in the trigger. The popup stays open across picks — toggle a few, then close to commit.",
      },
    },
  },
}

export const ManySelected: Story = {
  args: {
    value: ["billing", "chat", "vip", "tier_2"],
    onChange: () => {},
    options: QUEUE_OPTIONS,
  },
  render: () => <Controlled initial={["billing", "chat", "vip", "tier_2"]} />,
  parameters: {
    docs: {
      description: {
        story:
          'Past two memberships the trigger collapses to a count ("4 selected") — the cell keeps its width no matter how skilled the agent.',
      },
    },
  },
}

export const Empty: Story = {
  args: { value: [], onChange: () => {}, options: QUEUE_OPTIONS },
  render: () => <Controlled initial={[]} />,
  parameters: {
    docs: {
      description: {
        story:
          "No memberships shows the placeholder. Whether an empty set may commit (an agent covering nothing) is the container's validation.",
      },
    },
  },
}

export const Invalid: Story = {
  args: { value: [], onChange: () => {}, options: QUEUE_OPTIONS },
  render: () => <Controlled initial={[]} invalid />,
}

export const Disabled: Story = {
  args: {
    value: ["billing", "tier_2"],
    onChange: () => {},
    options: QUEUE_OPTIONS,
  },
  render: () => <Controlled initial={["billing", "tier_2"]} disabled />,
}
