"use client"

import type * as React from "react"

import { Duration } from "@workspace/ui/components/duration"
import { DeviationBar } from "@workspace/ui/components/deviation-bar"
import {
  EnumSelect,
  type EnumOption,
} from "@workspace/ui/components/enum-select"
import { Meter } from "@workspace/ui/components/meter"
import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { MultiSelectFieldEditor } from "@workspace/ui/components/multi-select-field-editor"
import { NumberFieldEditor } from "@workspace/ui/components/number-field-editor"
import { SparkBars } from "@workspace/ui/components/spark-bars"
import {
  StatusBadge,
  type Status,
} from "@workspace/ui/components/status-badge"
import { TextFieldEditor } from "@workspace/ui/components/text-field-editor"
import type { EditorProps } from "@workspace/ui/lib/editor"

import type { ColumnEdit, DataTableColumn } from "./data-table"

// The column TYPE system: a type is a resolver from one value shape to both
// faces of a cell — the view (a display primitive) and, where the value is
// editable, the editor (an editor primitive over the SAME value) — plus a
// default sort projection. A column then declares `type` + `get` instead of
// hand-wiring a `cell`, and view, inline editor, and row form all derive
// from the one declaration, so they cannot drift.
//
// Two kinds of type, one grammar: value-shaped PRIMITIVES (text, number,
// enum, multiselect, duration) and references to PREFERRED COMPONENTS
// (status → StatusBadge · EnumSelect; delta → MetricDelta; the view-only
// sparkbars / deviation / meter, which visualize but never accept input).
// Every type here is a FACTORY — `columnTypes.status()` like
// `columnTypes.enum(options)` — so the call-site grammar never depends on
// whether a type happens to take config.
//
// The registry is OPEN: this module ships the types whose views and value
// unions already live in ui; an app slice mints its own named types from the
// same factories (see `defineColumnTypes`) — agentState is an app enum, so
// it is an app type. `cell` / `renderEditor` on the column remain the escape
// hatch for anatomies richer than one value (the queue table's compound
// headroom cell), and they win over the type's faces by precedence.

/**
 * A column type: one value shape, both faces.
 *
 * `Draft` is the editor's in-flight value where it legitimately differs from
 * the committed shape — a number field's emptied state is `null`, not zero —
 * with `toDraft`/`fromDraft` adapting at the boundary (identity when
 * omitted). `fromDraft` returning `null` means "not committable as is";
 * enforcing that at commit time is the interaction layer's job.
 */
export interface ColumnType<V, Draft = V> {
  view: (value: V) => React.ReactNode
  /** The edit face; absent ⇒ the type is view-only (a visualization, not a field). */
  editor?: (props: EditorProps<Draft>) => React.ReactNode
  /** Begin an edit: committed value → draft. Identity when omitted. */
  toDraft?: (value: V) => Draft
  /** End an edit: draft → committable value, or `null` for "not yet valid". Identity when omitted. */
  fromDraft?: (draft: Draft) => V | null
  /** Default sort projection — a convenience the column's own `sortValue` overrides. */
  sortValue?: (value: V) => number | string
  align?: "left" | "right"
}

/** Severity order for the SLA scale: worst first under an ascending sort, matching the triage convention. */
const STATUS_RANK: Record<Status, number> = {
  breached: 0,
  out_of_adherence: 0,
  at_risk: 1,
  healthy: 2,
  adherent: 2,
}

const SLA_STATUSES: readonly Status[] = ["healthy", "at_risk", "breached"]

function text(cfg?: { placeholder?: string }): ColumnType<string> {
  return {
    view: (value) => value,
    editor: (props) => (
      <TextFieldEditor {...props} placeholder={cfg?.placeholder} />
    ),
    sortValue: (value) => value,
  }
}

function number(cfg?: {
  /** Muted suffix inside both the cell and the editor ("s", "%"). */
  unit?: string
  min?: number
  max?: number
  /** Cell text override; default is the raw value + unit. */
  format?: (value: number) => string
}): ColumnType<number, number | null> {
  return {
    view: (value) => (
      <span className="text-metric">
        {cfg?.format ? cfg.format(value) : `${value}${cfg?.unit ?? ""}`}
      </span>
    ),
    editor: (props) => (
      <NumberFieldEditor
        {...props}
        unit={cfg?.unit}
        min={cfg?.min}
        max={cfg?.max}
      />
    ),
    // The draft boundary IS this type's reason to exist twice: an emptied
    // field is a real draft (null), never zero — and never committable as is.
    toDraft: (value) => value,
    fromDraft: (draft) => draft,
    sortValue: (value) => value,
    align: "left",
  }
}

function enumOf<V extends string>(
  options: readonly EnumOption<V>[]
): ColumnType<V> {
  return {
    // The option's label IS the view — declare it once (rich labels welcome:
    // pass the display primitive itself and the picker previews the cell).
    view: (value) =>
      options.find((option) => option.value === value)?.label ?? value,
    editor: (props) => <EnumSelect {...props} options={options} />,
    // Declaration order is the semantic order — sort follows it, not the
    // alphabet (strain #6: "at_risk < breached < healthy" is nonsense).
    sortValue: (value) => options.findIndex((o) => o.value === value),
  }
}

function multiselect<V extends string>(
  options: readonly EnumOption<V>[]
): ColumnType<V[]> {
  return {
    view: (value) => {
      const selected = options.filter((o) => value.includes(o.value))
      if (selected.length === 0) return null
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1.5">
          {selected.map((option, i) => (
            <span key={option.value} className="inline-flex items-center gap-x-1.5">
              {i > 0 && <span aria-hidden>·</span>}
              {option.label}
            </span>
          ))}
        </span>
      )
    },
    editor: (props) => <MultiSelectFieldEditor {...props} options={options} />,
    // No default sort: neither count nor alphabet is the obvious meaning of
    // ordering memberships — a column that wants one says so itself.
  }
}

function duration(): ColumnType<number, number | null> {
  return {
    view: (value) => <Duration seconds={value} />,
    editor: (props) => <NumberFieldEditor {...props} unit="s" min={0} />,
    toDraft: (value) => value,
    fromDraft: (draft) => draft,
    sortValue: (value) => value,
  }
}

function status(): ColumnType<Status> {
  return {
    view: (value) => <StatusBadge status={value} />,
    // The picker previews the exact badge the cell will render. NOTE: on the
    // dashboard the SLA status is DERIVED (from sla_target_sec) — a column
    // there binds `edit` to the config field instead; this editor exists for
    // consumers whose status IS the stored field.
    editor: (props) => (
      <EnumSelect
        {...props}
        options={SLA_STATUSES.map((s) => ({
          value: s,
          label: <StatusBadge status={s} />,
        }))}
      />
    ),
    sortValue: (value) => STATUS_RANK[value],
  }
}

function delta(cfg?: { unit?: string }): ColumnType<number, number | null> {
  return {
    view: (value) => <MetricDelta value={value} unit={cfg?.unit} />,
    editor: (props) => <NumberFieldEditor {...props} unit={cfg?.unit} />,
    toDraft: (value) => value,
    fromDraft: (draft) => draft,
    sortValue: (value) => value,
  }
}

function sparkbars(cfg?: {
  threshold?: number
  bands?: number
  /** Row-independent accessible summary; SparkBars computes a sensible default. */
  label?: (points: number[]) => string
}): ColumnType<number[]> {
  return {
    view: (value) => (
      <SparkBars
        points={value}
        threshold={cfg?.threshold}
        bands={cfg?.bands}
        label={cfg?.label?.(value)}
      />
    ),
    // View-only, deliberately: a trend series visualizes observations — no
    // editor face exists to resolve. Same for deviation and meter below.
  }
}

function deviation(cfg: {
  /** Accessible name for the bar; receives the value ("46% over forecast"). */
  label: (value: number) => string
  range?: number
}): ColumnType<number> {
  return {
    view: (value) => (
      <DeviationBar value={value} label={cfg.label(value)} range={cfg.range} />
    ),
    sortValue: (value) => value,
  }
}

function meter(cfg: {
  max: number
  /** Accessible name for the fill; receives the value. */
  label: (value: number) => string
  status?: Status
}): ColumnType<number> {
  return {
    view: (value) => (
      <Meter
        value={value}
        max={cfg.max}
        label={cfg.label(value)}
        status={cfg.status}
      />
    ),
    sortValue: (value) => value,
  }
}

/**
 * The base type set — every factory ui can ship because the view and the
 * value union already live here. Uniform grammar: every type is a call,
 * config-taking or not.
 */
export const columnTypes = {
  text,
  number,
  enum: enumOf,
  multiselect,
  duration,
  status,
  delta,
  sparkbars,
  deviation,
  meter,
}

/**
 * Pin an app-side named-type registry: slices mint their own types from the
 * same factories where the union or view is app-owned —
 *
 *   const types = defineColumnTypes({
 *     agentState: columnTypes.enum(AGENT_STATE_OPTIONS),
 *   })
 *
 * An identity function whose value is its constraint: it keeps every entry a
 * real `ColumnType` while preserving each key's precise generic (a bare
 * annotation would widen them all to `ColumnType<any>`).
 */
export function defineColumnTypes<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, ColumnType<any, any>>,
>(types: T): T {
  return types
}

/** The column fields every builder shares; the type-specific config rides beside them. */
interface ColumnBase<Row> {
  key: string
  header: React.ReactNode
  className?: string
  align?: "left" | "right"
  /** Overrides the type's default sort projection. */
  sortValue?: (row: Row) => number | string
  edit?: ColumnEdit<Row>
}

/**
 * Typed column authoring — the fix for generic erasure: a heterogeneous
 * `DataTableColumn<Row>[]` cannot check that a column's `get` matches its
 * type's value shape (`{ type: columnTypes.number(), get: (q) => q.name }`
 * would slip through), so each builder ties them together at the call site:
 *
 *   const col = createColumns<Agent>()
 *   const columns = [
 *     col.text({ key: "agent", header: "Agent", get: (a) => a.name }),
 *     col.enum({ key: "state", header: "State", get: (a) => a.state, options: STATE_OPTIONS }),
 *   ]
 *
 * Raw column objects stay valid — this is ergonomics plus safety, not a new
 * required layer. `custom` covers registry types minted elsewhere
 * (`col.custom(types.agentState, {...})`).
 */
export function createColumns<Row>() {
  function make<V, Draft>(
    type: ColumnType<V, Draft>,
    cfg: ColumnBase<Row> & { get: (row: Row) => V }
  ): DataTableColumn<Row> {
    return { ...cfg, type } as DataTableColumn<Row>
  }

  return {
    text: (
      cfg: ColumnBase<Row> & {
        get: (row: Row) => string
        placeholder?: string
      }
    ) => {
      const { placeholder, ...rest } = cfg
      return make(text({ placeholder }), rest)
    },
    number: (
      cfg: ColumnBase<Row> & {
        get: (row: Row) => number
        unit?: string
        min?: number
        max?: number
        format?: (value: number) => string
      }
    ) => {
      const { unit, min, max, format, ...rest } = cfg
      return make(number({ unit, min, max, format }), rest)
    },
    enum: <V extends string>(
      cfg: ColumnBase<Row> & {
        get: (row: Row) => V
        options: readonly EnumOption<V>[]
      }
    ) => {
      const { options, ...rest } = cfg
      return make(enumOf(options), rest)
    },
    multiselect: <V extends string>(
      cfg: ColumnBase<Row> & {
        get: (row: Row) => V[]
        options: readonly EnumOption<V>[]
      }
    ) => {
      const { options, ...rest } = cfg
      return make(multiselect(options), rest)
    },
    duration: (cfg: ColumnBase<Row> & { get: (row: Row) => number }) =>
      make(duration(), cfg),
    status: (cfg: ColumnBase<Row> & { get: (row: Row) => Status }) =>
      make(status(), cfg),
    delta: (
      cfg: ColumnBase<Row> & { get: (row: Row) => number; unit?: string }
    ) => {
      const { unit, ...rest } = cfg
      return make(delta({ unit }), rest)
    },
    sparkbars: (
      cfg: ColumnBase<Row> & {
        get: (row: Row) => number[]
        threshold?: number
        bands?: number
        label?: (points: number[]) => string
      }
    ) => {
      const { threshold, bands, label, ...rest } = cfg
      return make(sparkbars({ threshold, bands, label }), rest)
    },
    deviation: (
      cfg: ColumnBase<Row> & {
        get: (row: Row) => number
        label: (value: number) => string
        range?: number
      }
    ) => {
      const { label, range, ...rest } = cfg
      return make(deviation({ label, range }), rest)
    },
    meter: (
      cfg: ColumnBase<Row> & {
        get: (row: Row) => number
        max: number
        label: (value: number) => string
        status?: Status
      }
    ) => {
      const { max, label, status: tint, ...rest } = cfg
      return make(meter({ max, label, status: tint }), rest)
    },
    /** Any ColumnType minted elsewhere — app registries, inline one-offs. */
    custom: <V, Draft>(
      type: ColumnType<V, Draft>,
      cfg: ColumnBase<Row> & { get: (row: Row) => V }
    ) => make(type, cfg),
  }
}
