import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  EnumSelect,
  type EnumOption,
} from "@workspace/ui/components/enum-select"
import { StatusDot, type Status } from "@workspace/ui/components/status-badge"

const meta = {
  title: "components/atoms/enum-select",
  component: EnumSelect,
  parameters: {
    docs: {
      description: {
        component: `
The edit face of a one-of-N value — the editor an \`enum\` column type (and the preferred-component types built on it: \`status\`, an app's \`agentState\`) resolves to. Composes the vendored \`Select\`; the generic \`V\` keeps the chosen value on the **same union the display primitive renders**, so view and editor cannot drift.

The keyboard grammar adapts to a picker: **picking an option IS the save intent** (\`onChange\` then \`onCommit\`, both in the same tick — which is why \`onCommit\` carries the draft it means, rather than leaving the container to read one that has not rendered yet), and **Escape maps to onCancel** whether the popup is open or the trigger is focused closed. Enter/Space stay native — they open the picker.

**Use it for:** an agent's state, any status-class enum — one value from a short, closed set.

**Not for:**
- Multi-membership lists — \`MultiSelectFieldEditor\`.
- Open-ended text — \`TextFieldEditor\`.
- Long or searchable option sets — this system's enums are 3–5 values; a combobox is unearned.

**Deliberately omitted:** a clearable/none state (a required enum has no "no value" pick — optionality would belong to the field, not the picker); per-option color props (options may pass a rich label — the display primitive itself — so the picker previews exactly what the cell will show, and tint stays sealed inside that primitive); commit buttons (commit-policy-agnostic, like every editor).

Stateless leaf: the draft lives in the container; it never owns feed states.
`,
      },
    },
  },
} satisfies Meta<typeof EnumSelect>

export default meta
type Story = StoryObj<typeof meta>

type AgentState =
  | "available"
  | "on_call"
  | "on_break"
  | "in_meeting"
  | "offline"

const AGENT_STATE_OPTIONS: readonly EnumOption<AgentState>[] = [
  { value: "available", label: "Available" },
  { value: "on_call", label: "On a call" },
  { value: "on_break", label: "On break" },
  { value: "in_meeting", label: "In a meeting" },
  { value: "offline", label: "Offline" },
]

/** The status union ships with ui, so its options can preview the real glyph. */
const STATUS_OPTIONS: readonly EnumOption<Status>[] = (
  ["healthy", "at_risk", "breached"] as const
).map((status) => ({
  value: status,
  label: (
    <span className="flex items-center gap-1.5">
      <StatusDot status={status} decorative />
      {status === "healthy"
        ? "Healthy"
        : status === "at_risk"
          ? "At risk"
          : "Breached"}
    </span>
  ),
}))

/** Stories control the draft locally so picking works in the canvas. */
function Controlled<V extends string>(props: {
  initial: V
  options: readonly EnumOption<V>[]
  invalid?: boolean
  disabled?: boolean
}) {
  const [value, setValue] = useState<V>(props.initial)
  const [note, setNote] = useState<string | null>(null)
  return (
    <div className="flex w-48 flex-col gap-2">
      <EnumSelect
        value={value}
        onChange={setValue}
        onCommit={(draft) => setNote(`committed "${draft}" — a pick is the intent`)}
        onCancel={() => {
          setValue(props.initial)
          setNote("cancelled — draft reverted")
        }}
        options={props.options}
        invalid={props.invalid}
        disabled={props.disabled}
        aria-label="Agent state"
      />
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {note ?? "picking commits · Escape cancels"}
      </p>
    </div>
  )
}

export const Default: Story = {
  args: { value: "on_break", onChange: () => {}, options: AGENT_STATE_OPTIONS },
  render: () => (
    <Controlled
      initial={"on_break" as AgentState}
      options={AGENT_STATE_OPTIONS}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The agent-state shape: five plain-label values. The generic keeps the value on the app's own union.",
      },
    },
  },
}

export const RichOptionLabels: Story = {
  args: { value: "at_risk", onChange: () => {}, options: STATUS_OPTIONS },
  render: () => (
    <Controlled initial={"at_risk" as Status} options={STATUS_OPTIONS} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Options carry the display primitive itself (here the status glyph), so the picker previews exactly what the cell will render — the tint stays sealed inside StatusDot, never a prop of the picker.",
      },
    },
  },
}

export const Invalid: Story = {
  args: { value: "offline", onChange: () => {}, options: AGENT_STATE_OPTIONS },
  render: () => (
    <Controlled
      initial={"offline" as AgentState}
      options={AGENT_STATE_OPTIONS}
      invalid
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "`invalid` sets `aria-invalid` and the destructive ring on the trigger — e.g. the container rejecting a state change that conflicts with a scheduled shift.",
      },
    },
  },
}

export const Disabled: Story = {
  args: { value: "on_call", onChange: () => {}, options: AGENT_STATE_OPTIONS },
  render: () => (
    <Controlled
      initial={"on_call" as AgentState}
      options={AGENT_STATE_OPTIONS}
      disabled
    />
  ),
}
