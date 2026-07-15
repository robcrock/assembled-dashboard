import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { NumberFieldEditor } from "@workspace/ui/components/number-field-editor"

const meta = {
  title: "components/atoms/number-field-editor",
  component: NumberFieldEditor,
  parameters: {
    docs: {
      description: {
        component: `
The edit face of a numeric value — the editor \`number\`, \`duration\`, and \`delta\` column types resolve to. Composes the vendored \`Input\` with **tabular figures** (a draft lines up exactly like the metric it edits), an optional muted **unit suffix** ("s", "%"), and the shared grammar (**Enter → onCommit, Escape → onCancel**).

**Use it for:** editing the numeric *config behind* a display — an SLA target in seconds behind a \`StatusBadge\`, a forecast volume behind a \`DeviationBar\`.

**Not for:**
- Observed telemetry (waiting counts, wait trends) — those are read-only by design; editing them would be lying to the floor.
- One-of-N or list values — \`EnumSelect\` / \`MultiSelectFieldEditor\`.

**Deliberately omitted:** spinner buttons (20px of chrome to do what typing already does — stripped); a commit/cancel button pair (commit-policy-agnostic, like every editor); unit *conversion* (the unit is a caption, not a converter — the value stays in the field's own unit); min/max *enforcement* (they ride to the native input as hints, but blocking an out-of-range commit is container validation surfaced back through \`invalid\`).

The value is \`number | null\`: an emptied field is a real draft state, not zero. Stateless leaf: the draft lives in the container; it never owns feed states.
`,
      },
    },
  },
} satisfies Meta<typeof NumberFieldEditor>

export default meta
type Story = StoryObj<typeof meta>

/** Stories control the draft locally so typing works in the canvas. */
function Controlled(props: {
  initial: number | null
  unit?: string
  min?: number
  max?: number
  invalid?: boolean
  disabled?: boolean
  validate?: (value: number | null) => string | null
}) {
  const [value, setValue] = useState<number | null>(props.initial)
  const [note, setNote] = useState<string | null>(null)
  const error = props.validate?.(value) ?? null
  return (
    <div className="flex w-40 flex-col gap-2">
      <NumberFieldEditor
        value={value}
        onChange={(next) => {
          setValue(next)
          setNote(null)
        }}
        onCommit={() => setNote(error ? "blocked by validation" : "committed")}
        onCancel={() => {
          setValue(props.initial)
          setNote("cancelled — draft reverted")
        }}
        unit={props.unit}
        min={props.min}
        max={props.max}
        invalid={props.invalid || error !== null}
        disabled={props.disabled}
        aria-label="SLA target"
      />
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {error ?? note ?? "Enter commits · Escape cancels"}
      </p>
    </div>
  )
}

export const Default: Story = {
  args: { value: 120, onChange: () => {} },
  render: () => <Controlled initial={120} unit="s" />,
  parameters: {
    docs: {
      description: {
        story:
          'The dashboard\'s shape: a duration-flavored number ("SLA target, seconds"). The unit is a muted caption inside the field.',
      },
    },
  },
}

export const NoUnit: Story = {
  args: { value: 56, onChange: () => {} },
  render: () => <Controlled initial={56} />,
}

export const EmptyDraft: Story = {
  args: { value: null, onChange: () => {} },
  render: () => <Controlled initial={null} unit="s" />,
  parameters: {
    docs: {
      description: {
        story:
          "`null` is the emptied-field draft — deliberately distinct from 0. Whether it may commit is the container's call.",
      },
    },
  },
}

export const ContainerValidation: Story = {
  args: { value: 400, onChange: () => {} },
  render: () => (
    <Controlled
      initial={400}
      unit="s"
      min={30}
      max={300}
      validate={(v) =>
        v === null
          ? "A target is required"
          : v < 30 || v > 300
            ? "Target must be 30–300s"
            : null
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The intended division of labor: the CONTAINER validates (here 30–300s) and reflects the verdict back through `invalid`; the editor only wears the face. Try a value in range.",
      },
    },
  },
}

export const Disabled: Story = {
  args: { value: 120, onChange: () => {} },
  render: () => <Controlled initial={120} unit="s" disabled />,
}
