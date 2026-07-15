import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { TextFieldEditor } from "@workspace/ui/components/text-field-editor"

const meta = {
  title: "components/atoms/text-field-editor",
  component: TextFieldEditor,
  parameters: {
    docs: {
      description: {
        component: `
The edit face of a plain-text value — the editor a \`text\` column type resolves to. Composes the vendored \`Input\` and adds the shared editor contract: a controlled \`value\`/\`onChange\` draft plus the one keyboard grammar (**Enter → onCommit, Escape → onCancel**).

**Use it for:** editing a string field in place — a queue's name, an agent's name — inline in a cell or as a field in a row-edit form.

**Not for:**
- Numbers — \`NumberFieldEditor\` keeps tabular figures and unit context.
- One-of-N values — \`EnumSelect\`.
- Free-form multi-line notes — that's a textarea-shaped need this system hasn't earned yet.

**Deliberately omitted:** a commit/cancel button pair (the editor is **commit-policy-agnostic** — the container decides when a draft saves, so the same editor serves an inline cell and a batched row form); commit-on-blur (blur policy belongs to the container's wrapper — baking it in here would break batched forms); a label prop (the container names the control via \`aria-label\`, e.g. from its column header); validation logic (the container validates and reflects the result back through \`invalid\`).

Stateless leaf: the draft lives in the container; it never owns feed states.
`,
      },
    },
  },
} satisfies Meta<typeof TextFieldEditor>

export default meta
type Story = StoryObj<typeof meta>

/** Stories control the draft locally so typing works in the canvas. */
function Controlled(props: {
  initial: string
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState(props.initial)
  const [note, setNote] = useState<string | null>(null)
  return (
    <div className="flex w-64 flex-col gap-2">
      <TextFieldEditor
        value={value}
        onChange={(next) => {
          setValue(next)
          setNote(null)
        }}
        onCommit={() => setNote(`committed "${value}"`)}
        onCancel={() => {
          setValue(props.initial)
          setNote("cancelled — draft reverted")
        }}
        invalid={props.invalid}
        disabled={props.disabled}
        placeholder={props.placeholder}
        aria-label="Queue name"
      />
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {note ?? "Enter commits · Escape cancels"}
      </p>
    </div>
  )
}

export const Default: Story = {
  args: { value: "Billing", onChange: () => {} },
  render: () => <Controlled initial="Billing" />,
}

export const Empty: Story = {
  args: { value: "", onChange: () => {} },
  render: () => <Controlled initial="" placeholder="Queue name" />,
  parameters: {
    docs: {
      description: {
        story:
          "An emptied draft shows the placeholder in muted ink. Whether an empty string may commit is the container's validation, not the editor's.",
      },
    },
  },
}

export const Invalid: Story = {
  args: { value: "", onChange: () => {} },
  render: () => <Controlled initial="" invalid placeholder="Queue name" />,
  parameters: {
    docs: {
      description: {
        story:
          "The failed-validation face: `invalid` sets `aria-invalid` and the destructive ring. The message itself renders in the container, next to whatever layout it owns.",
      },
    },
  },
}

export const Disabled: Story = {
  args: { value: "Billing", onChange: () => {} },
  render: () => <Controlled initial="Billing" disabled />,
}
