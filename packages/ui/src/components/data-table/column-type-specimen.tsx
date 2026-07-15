import type * as React from "react"

import { columnTypes, type ColumnType } from "./column-types"

// Doc helper for the "column types" MDX page (same pattern as
// docs/icon-specimen.tsx): the specimen catalog as a real, typechecked
// component instead of inline MDX expressions — JSX-generating logic in MDX
// trips the docs error boundary and never sees tsc.

interface Specimen {
  name: string
  shape: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous catalog row
  type: ColumnType<any, any>
  sample: unknown
}

const STATE_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "on_break", label: "On break" },
  { value: "offline", label: "Offline" },
] as const

const QUEUE_OPTIONS = [
  { value: "billing", label: "Billing" },
  { value: "chat", label: "Chat" },
  { value: "vip", label: "VIP" },
] as const

const SPECIMENS: Specimen[] = [
  { name: "text()", shape: "string", type: columnTypes.text(), sample: "Billing" },
  {
    name: 'number({ unit: "s" })',
    shape: "number",
    type: columnTypes.number({ unit: "s" }),
    sample: 120,
  },
  {
    name: "enum(options)",
    shape: "union member",
    type: columnTypes.enum(STATE_OPTIONS),
    sample: "on_break",
  },
  {
    name: "multiselect(options)",
    shape: "string[]",
    type: columnTypes.multiselect(QUEUE_OPTIONS),
    sample: ["billing", "vip"],
  },
  {
    name: "duration()",
    shape: "seconds",
    type: columnTypes.duration(),
    sample: 1500,
  },
  {
    name: "status()",
    shape: "SlaStatus",
    type: columnTypes.status(),
    sample: "at_risk",
  },
  { name: "delta()", shape: "number", type: columnTypes.delta(), sample: 25 },
  {
    name: "sparkbars({ threshold })",
    shape: "number[]",
    type: columnTypes.sparkbars({ threshold: 120 }),
    sample: [48, 70, 105, 132, 168, 175],
  },
  {
    name: "deviation({ label })",
    shape: "number",
    type: columnTypes.deviation({ label: (v) => `${v}% over` }),
    sample: 46,
  },
  {
    name: "meter({ max, label })",
    shape: "number",
    type: columnTypes.meter({ max: 100, label: (v) => `${v} of 100` }),
    sample: 72,
  },
]

function EditorSpecimen({ specimen }: { specimen: Specimen }) {
  const { type, sample } = specimen
  if (!type.editor) return <em>view-only</em>
  const draft = type.toDraft ? type.toDraft(sample) : sample
  return (
    <div className="max-w-52">
      {type.editor({ value: draft, onChange: () => {} })}
    </div>
  )
}

/** The full type catalog: name, value shape, and both live faces per type. */
export function ColumnTypeCatalog(): React.ReactNode {
  return (
    <table>
      <thead>
        <tr>
          <th>type</th>
          <th>value shape</th>
          <th>view</th>
          <th>editor</th>
        </tr>
      </thead>
      <tbody>
        {SPECIMENS.map((specimen) => (
          <tr key={specimen.name}>
            <td>
              <code>{specimen.name}</code>
            </td>
            <td>
              <code>{specimen.shape}</code>
            </td>
            <td>{specimen.type.view(specimen.sample)}</td>
            <td>
              <EditorSpecimen specimen={specimen} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
