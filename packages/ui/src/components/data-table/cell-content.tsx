"use client"

import * as React from "react"

import { Duration } from "@workspace/ui/components/duration"
import {
  EnumSelect,
  type EnumOption,
} from "@workspace/ui/components/enum-select"
import { MultiSelectFieldEditor } from "@workspace/ui/components/multi-select-field-editor"
import { NumberFieldEditor } from "@workspace/ui/components/number-field-editor"
import { TextFieldEditor } from "@workspace/ui/components/text-field-editor"
import type { EditorProps } from "@workspace/ui/lib/editor"
import { cn } from "@workspace/ui/lib/utils"

import {
  cellState,
  type ContentAddress,
  type EditBehavior,
  type EditSlot,
} from "./cell-state"

// A cell holds CONTENT; content that `edits` is editable.
//
// This is the authoring grammar. A column writes ONE anatomy in its `cell`,
// and any part of it the operator controls is built with the `content` builder
// handed to the renderer:
//
//   cell: (q, content) => (
//     <DeviationCell
//       measures={<><Duration seconds={q.longest_wait_sec} /> /{" "}
//         {content.duration({ edits: "sla_target_sec", min: 10, max: 86_400 })}</>}
//       delta={<MetricDelta value={q.sla_headroom_pct} />}
//     />
//   )
//
// THE ANATOMY IS NEVER GIVEN THE STATE. There is no `editing` flag to branch
// on and no second renderer to keep in sync, so the author has no way to make
// the read face and the edit face disagree — which is the disease this module
// exists to cure. The incumbent authored a compound cell's anatomy THREE times
// (`cell`, `editCell`, `renderField`) with nothing binding the copies, and
// every invariant between them was a promise in a JSDoc.
//
// PRESENCE IS THE CAPABILITY. `edits` names the row key, so the value shown
// and the value committed cannot disagree — they are the same key, read once.
// There is no `editable: true`, no `readOnly`, and deliberately NO `reads`
// counterpart: a read-only value is better written as the primitive it already
// is (`<Duration seconds={q.longest_wait_sec} />`), which is exactly what both
// dashboard tables already do. A `reads` overload would ship with zero
// consumers, and this repo mints on first use, not speculatively.
//
// The word `field` is banned here on purpose. In Airtable, Notion, SQL and AG
// Grid's `colDef.field`, a FIELD IS A COLUMN — it points one tier up from
// where it renders, so `<Field>` inside a cell reads as a category error to
// anyone who has used those tools. What's inside a cell is its CONTENT.

/* ---- the contract --------------------------------------------------------- */

/**
 * Content a cell shows. `show` is the value in its DISPLAY representation —
 * the read face, and the only thing a cell without a box ever renders.
 *
 * Sets no type scale. That belongs to the td and the anatomy, never to the
 * value: the incumbent's `editCell` re-declared the Agent clock's size and
 * ink, and entering edit mode restyled every clock on the floor.
 */
export interface CellContent<V> {
  show: (value: V) => React.ReactNode
}

/**
 * The edit face, over the SAME value `show` renders. Extends the machine's
 * behavioral half rather than restating it — `popup` lives on `EditBehavior`
 * and is read by the reducer, so a second declaration here would be exactly
 * the drift this module deletes.
 */
export interface EditCapability<V, Draft> extends EditBehavior<V, Draft> {
  /**
   * An element FACTORY the cell CALLS — never a component type it mounts.
   * That distinction is a live bug on main: `createElement(face.type.editor!)`
   * uses a per-tick arrow as the element TYPE, so every poll remounts the
   * control and eats the caret (autoFocus masks it; IME composition dies).
   * Called, the element's type is the stable inner primitive.
   */
  control: (props: EditorProps<Draft>) => React.ReactNode
  /**
   * The draft in the CONTROL's own representation — what the box actually has
   * to hold, in both its states.
   *
   * This exists because `show` cannot do it, which the first compound duration
   * cell proved: an SLA target DISPLAYS as `2m` (9px) and is TYPED as `120`
   * (27px). Sizing the box from `show` clipped the live control down to its
   * unit suffix — the operator saw `[s]` and no number. Click parity still
   * "passed", because the box held its width by amputating the control; a
   * measurement that green-lights an invisible input is measuring the wrong
   * thing.
   *
   * So: `show` is how the value READS; `showDraft` is how the draft TYPES, and
   * the box is sized from the latter. Identical for text/number/enum — the
   * duration pair is the only one where a value's two representations
   * genuinely differ. The author writes NEITHER (both are the builder's), so
   * they still cannot be made to disagree at a call site, which was the point.
   */
  showDraft: (draft: Draft) => React.ReactNode
}

/**
 * Content the operator controls. ONE nested capability, NO optional members: a
 * capability is complete or it does not exist. The four sibling optionals it
 * replaces (`edit`/`editCell`/`renderField`/`type.editor`) could express
 * sixteen combinations, twelve of them nonsense — and five of them shipped.
 */
export interface EditableCellContent<V, Draft = V> extends CellContent<V> {
  edit: EditCapability<V, Draft>
}

/* ---- the one box ---------------------------------------------------------- */

/**
 * The group name the editable content wears, so its box can answer a hover
 * landing anywhere in the cell. NAMED, not a bare `group`: `TableRow` is
 * already hoverable and `group-hover:` matches ANY `.group` ancestor, so an
 * unnamed group would let a row hover light every box in it.
 */
export const EDITABLE_CONTENT_GROUP = "group/cellcontent"

/**
 * The one box. A BOX MEANS AN EDITABLE VALUE — nothing else in the table wears
 * this border, so the eye sweeps a row in edit mode and knows what it may
 * change without touching anything. That only holds while there is exactly ONE
 * recipe, and while nothing but this module can apply it: on main the frame is
 * AUTHOR-ENFORCED, so a bare-text `editCell` typechecks and opens an unboxed
 * editor. Here it is package-private and applied by the only thing that mounts
 * a control.
 *
 * The border is muted INK at low alpha, deliberately NOT `border-input`:
 * `--input`, `--border` and `--muted` all resolve to the same concrete step,
 * so an input-bordered box on a selected row (`bg-muted`) draws its border in
 * the row's own colour and vanishes — selection would erase the very
 * affordance that says "this is editable".
 *
 * `align-middle` + `-my-0.5` keep an inline-flex box from growing the line box
 * that holds it. A 24px (h-6) inline-flex inside a 20px text line would make
 * the td taller than the row rhythm; the negative margin returns its
 * contribution to the line's own 20px. This is arithmetic until it is
 * measured — ROB-101/102 verify it in both rhythms (h-10 agents, h-14 queues)
 * and both themes, against the oracle.
 *
 * Carries BOTH hover triggers so the two cell kinds respond identically by
 * construction rather than by agreement: `hover:` for content that fills its
 * cell, `group-hover/cellcontent:` for a box inside a compound anatomy, where
 * the box is the affordance and the cell is only the hit area.
 */
export const EDITABLE_CONTENT_FRAME =
  "inline-flex h-6 min-w-0 items-center rounded-sm border border-muted-foreground/30 bg-transparent px-2 align-middle -my-0.5 transition-colors hover:border-ring hover:bg-muted/40 group-hover/cellcontent:border-ring group-hover/cellcontent:bg-muted/40"

/* ---- the live control ----------------------------------------------------- */

interface CellControlProps<Draft> {
  control: (props: EditorProps<Draft>) => React.ReactNode
  editorProps: EditorProps<Draft>
}

/**
 * Mounts the live control. MODULE-LEVEL and stable, with `control` arriving as
 * a PROP rather than as the element type — the whole of bug 7's fix. Because
 * this component's identity never changes, a poll tick re-rendering the table
 * updates the control in place instead of tearing it down, and the caret and
 * any in-flight IME composition survive.
 *
 * A component rather than an inline `control(props)` call so the factory gets
 * its own instance: a control that legitimately holds hooks keeps a stable
 * hook position across ticks, and its mount boundary is exactly the `editing`
 * state rather than wherever the call happened to sit.
 */
function CellControl<Draft>({ control, editorProps }: CellControlProps<Draft>) {
  return <>{control(editorProps)}</>
}

/* ---- the renderer --------------------------------------------------------- */

/**
 * The one gesture that changes an editable value. The container supplies the
 * policy (`lib/editor.ts` — editors stay commit-policy-agnostic); this reports
 * intents and never decides what they mean.
 */
export interface CellValueEvents<V, Draft> {
  onOpen: (
    address: ContentAddress,
    behavior: EditBehavior<V, Draft>,
    value: V
  ) => void
  onChange: (address: ContentAddress, draft: Draft) => void
  onCommit: (
    address: ContentAddress,
    behavior: EditBehavior<V, Draft>,
    value: V,
    via: "enter" | "blur" | "pick",
    /** The freshest draft this gesture saw — never the slot's render-old copy. */
    draft: Draft
  ) => void
  onCancel: (address: ContentAddress) => void
}

interface CellValueProps<V, Draft> {
  content: EditableCellContent<V, Draft>
  value: V
  address: ContentAddress
  /** The table's edit mode. Capability without mode still reads. */
  mode: boolean
  slot: EditSlot | null
  /** Accessible name — "Edit SLA target, Billing". */
  label: string
  events: CellValueEvents<V, Draft>
}

/**
 * One editable value, in whichever of its three states it is in. The switch is
 * total and each arm is written once; there is no branch an author can get
 * wrong because there is no branch an author writes.
 *
 * `editable` and `editing` wear the IDENTICAL box, which is what stops the
 * figure jumping on click. The committed face stays in flow while editing as
 * an invisible, aria-hidden WIDTH STRUT, and the control lays over it —
 * chromeless, at the inherited type scale — so the box measures the same
 * before and after the click, and a poll tick can't resize it under the caret.
 */
export function CellValue<V, Draft>({
  content,
  value,
  address,
  mode,
  slot,
  label,
  events,
}: CellValueProps<V, Draft>) {
  // The freshest draft this cell has seen, readable synchronously. A picker
  // fires onChange(next) + onCommit() in ONE tick (EnumSelect does), so the
  // rendered `state.draft` is a render behind when onCommit lands — and
  // onCommit carries no value of its own. A sentinel object rather than a bare
  // `Draft | undefined`: `null` and `undefined` are legitimate drafts (an
  // emptied number field is exactly `null`), so "has a live draft" cannot be
  // inferred from the value.
  const live = React.useRef<{ draft: Draft } | null>(null)

  const state = cellState({ edit: content.edit, mode, value, address, slot })

  if (state.state === "reading") return <>{content.show(value)}</>

  // The box shows the DRAFT, not the value — the figure in the form you will
  // actually type it in. For text/number/enum that is the same string `show`
  // would render; for a duration it is `120s` where the read face says `2m`,
  // and showing `2m` here would size the box to a figure the control cannot
  // fit. A box is a promise that a click edits THIS; it should show the thing
  // it is promising.
  if (state.state === "editable") {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          live.current = null
          events.onOpen(address, content.edit, value)
        }}
        className={cn("text-left focus-ring", EDITABLE_CONTENT_FRAME)}
      >
        <span className="min-w-0 truncate">
          {content.edit.showDraft(content.edit.draft(value))}
        </span>
      </button>
    )
  }

  // The strut measures the DRAFT in the control's own representation, so the
  // box grows with what is being typed and the control it holds is never
  // clipped. An uncommittable draft (an emptied field is exactly that) has
  // nothing to measure, so the box holds at the committed width rather than
  // collapsing to nothing under the caret.
  const strutDraft = state.committable ? state.draft : content.edit.draft(value)

  /** The draft to commit: whatever this tick's onChange saw, else the rendered one. */
  const freshest = () => (live.current ? live.current.draft : state.draft)

  const editorProps: EditorProps<Draft> = {
    value: state.draft,
    onChange: (next) => {
      live.current = { draft: next }
      events.onChange(address, next)
    },
    onCommit: () =>
      events.onCommit(
        address,
        content.edit,
        value,
        content.edit.popup ? "pick" : "enter",
        freshest()
      ),
    onCancel: () => events.onCancel(address),
    autoFocus: true,
    invalid: !state.committable,
    "aria-label": label,
    // Chromeless and flush: the BOX is the affordance, so the control inside it
    // must not paint a second one. It inherits the anatomy's type scale rather
    // than setting its own — the value looks the same being typed as it does
    // at rest.
    //
    // POSITIONING IS NOT IN HERE, and that is the contract, not a preference:
    // `EditorProps.className` reaches "whatever paints the border, never a
    // positioning wrapper" (lib/editor.ts). Passing `absolute inset-0` through
    // it put the class on NumberFieldEditor's INPUT while its own wrapper
    // stayed in flow — a flex sibling of the strut, so the two shrank to half
    // the box each and the live control was clipped to its unit suffix. The
    // overlay below is the cell's own, which is the only thing that can be.
    // The `md:` twin is load-bearing, not belt-and-braces: the vendored Input
    // ships `md:text-sm`, and a variant beats a base utility at every width
    // this dashboard is used at — so a bare `text-[length:inherit]` lost, and
    // tailwind-merge never deduped it because the two live in different
    // variant groups. The control rendered 14px while the anatomy (and the
    // strut sizing its box) rendered 12px: the typed figure was bigger than
    // the resting one AND overflowed a box measured for the smaller. Matching
    // the variant is what lets the merge do its job.
    className:
      "h-full w-full rounded-none border-0 bg-transparent px-0 text-[length:inherit] shadow-none focus-visible:ring-0 md:text-[length:inherit]",
  }

  return (
    <span
      className={cn("relative", EDITABLE_CONTENT_FRAME)}
      // A popup control's focus lives in a portal, so blur is noise and the
      // listener is never attached — baking commit-on-blur in would break the
      // picker cells. The machine independently ignores a blur it shouldn't
      // get, so this is belt and braces, not the only guard.
      onBlur={
        content.edit.popup
          ? undefined
          : (event: React.FocusEvent<HTMLSpanElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                events.onCommit(
                  address,
                  content.edit,
                  value,
                  "blur",
                  freshest()
                )
              }
            }
      }
    >
      {/* The strut: the box's ONLY in-flow child, so it alone decides the
          width, and the width it decides is the draft's — the same one the
          resting box shows. */}
      <span aria-hidden className="invisible min-w-0 truncate">
        {content.edit.showDraft(strutDraft)}
      </span>
      {/* The overlay: the cell's own positioning wrapper, laid exactly over the
          strut. It has to live here rather than ride in on the editor's
          className, because an editor styles its FIELD and keeps its own
          wrapper — park `absolute` on the field and the wrapper stays a flex
          sibling of the strut, which is how the control got clipped. */}
      <span className="absolute inset-0 flex items-center px-2">
        <CellControl control={content.edit.control} editorProps={editorProps} />
      </span>
    </span>
  )
}

/* ---- which keys may be edited --------------------------------------------- */

/*
 * `Setting` is the app's list of keys an operator controls; everything else on
 * the row is an OBSERVATION, and an editable observation is a lie about the
 * floor. The word "observation" appears nowhere in the code — it is expressed
 * by ABSENCE from the union, and the compile error is the word.
 *
 * These three helpers then check that the key's VALUE SHAPE matches the
 * builder being called, which is the half `edit.field` (a bare string) never
 * checked at all.
 */

/** Mutually assignable: `sla_target_sec: number` is a number setting; `state: AgentState` is not a text one. */
type SettingOf<Row, Setting extends Extract<keyof Row, string>, V> = {
  [K in Setting]: Row[K] extends V ? (V extends Row[K] ? K : never) : never
}[Setting]

/** A closed union only — a picker over `name: string` would be a picker over every string. */
type ChoiceSettingOf<Row, Setting extends Extract<keyof Row, string>> = {
  [K in Setting]: string extends Row[K]
    ? never
    : Row[K] extends string
      ? K
      : never
}[Setting]

/** A list of a closed union — multiselect's domain. */
type ListSettingOf<Row, Setting extends Extract<keyof Row, string>> = {
  [K in Setting]: Row[K] extends readonly string[] ? K : never
}[Setting]

/** The member type of a list setting — what `multiselect`'s options must offer. */
type MemberOf<T> = T extends readonly (infer M)[]
  ? M extends string
    ? M
    : never
  : never

/* ---- the builder ---------------------------------------------------------- */

/**
 * The `content` handed to a column's `cell`. Every method returns a NODE — the
 * builder mints the content, addresses it, and renders it, so a call site
 * writes the value where it belongs in the anatomy and nothing else.
 *
 * `Setting` defaults to `never` upstream, so a table that declared no settings
 * has no key it can pass and the whole builder is unreachable by construction
 * rather than by discipline.
 */
export interface CellContentBuilder<
  Row,
  Setting extends Extract<keyof Row, string>,
> {
  text: (cfg: {
    edits: SettingOf<Row, Setting, string>
    placeholder?: string
  }) => React.ReactNode
  number: (cfg: {
    edits: SettingOf<Row, Setting, number>
    /** Muted suffix inside both the value and the control ("s", "%"). */
    unit?: string
    min?: number
    max?: number
    format?: (value: number) => string
  }) => React.ReactNode
  duration: (cfg: {
    edits: SettingOf<Row, Setting, number>
    min?: number
    max?: number
  }) => React.ReactNode
  /*
   * Generic over the KEY, not the value — the difference is load-bearing. With
   * `<V extends string>` inferred from `options`, V floats free of the key and
   * `{ edits: "state", options: QUEUE_OPTIONS }` typechecks: a picker offering
   * values the key cannot hold, committing `state: "billing"` into an
   * AgentState. Binding the options to `Row[K]` is what closes the second half
   * of `edit.field`'s unchecked-string bug — the key AND its value shape.
   */
  enum: <K extends ChoiceSettingOf<Row, Setting>>(cfg: {
    edits: K
    options: readonly EnumOption<Row[K] & string>[]
  }) => React.ReactNode
  multiselect: <K extends ListSettingOf<Row, Setting>>(cfg: {
    edits: K
    options: readonly EnumOption<MemberOf<Row[K]>>[]
  }) => React.ReactNode
}

/** Everything the builder needs to address and render one cell's contents. */
export interface CellContentContext<Row> {
  row: Row
  rowKey: string
  columnKey: string
  mode: boolean
  slot: EditSlot | null
  /** Names the control — "Edit <column>, <row>". */
  columnLabel: string
  rowLabel: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous across the row's columns by nature
  events: CellValueEvents<any, any>
}

/** In range, or not a value yet. An out-of-range number HOLDS on Enter rather than committing a lie. */
function inRange(value: number, min?: number, max?: number): number | null {
  if (min !== undefined && value < min) return null
  if (max !== undefined && value > max) return null
  return value
}

/**
 * Mint the builder for one (row, column). Called per cell, closed over the row
 * — so a column's `cell` receives a builder that already knows which row it is
 * writing, and `edits: "sla_target_sec"` is the whole call site.
 */
export function cellContentBuilder<
  Row,
  Setting extends Extract<keyof Row, string>,
>(ctx: CellContentContext<Row>): CellContentBuilder<Row, Setting> {
  function render<V, Draft>(
    key: string,
    content: EditableCellContent<V, Draft>
  ): React.ReactNode {
    const address: ContentAddress = {
      rowKey: ctx.rowKey,
      columnKey: ctx.columnKey,
      key,
    }
    return (
      <CellValue
        content={content}
        value={(ctx.row as Record<string, unknown>)[key] as V}
        address={address}
        mode={ctx.mode}
        slot={ctx.slot}
        label={`Edit ${ctx.columnLabel}, ${ctx.rowLabel}`}
        events={ctx.events}
      />
    )
  }

  return {
    text: (cfg) =>
      render<string, string>(cfg.edits as string, {
        show: (value) => value,
        edit: {
          control: (props) => (
            <TextFieldEditor {...props} placeholder={cfg.placeholder} />
          ),
          // Same string either way — a name reads as it types.
          showDraft: (draft) => draft,
          draft: (value) => value,
          // An emptied name is a draft, never a commit: a queue called "" is
          // not a thing the floor can have.
          commit: (draft) => (draft.trim() === "" ? null : draft),
        },
      }),

    number: (cfg) =>
      render<number, number | null>(cfg.edits as string, {
        // `tabular-nums` and nothing else. Tabular figures are a property of
        // the VALUE (a ticking number must not jitter its own width); the type
        // SCALE belongs to the anatomy that holds it. The incumbent's `number`
        // type set `text-metric` because it was a whole cell — carried in here
        // it would force 14px inside DeviationCell's 12px line and silently
        // resize the figure. This is the rule `show` documents, in the one
        // place it was easiest to break: same recipe as `Duration`.
        show: (value) => (
          <span className="tabular-nums">
            {cfg.format ? cfg.format(value) : `${value}${cfg.unit ?? ""}`}
          </span>
        ),
        edit: {
          // No `unit` here, deliberately: NumberFieldEditor renders a unit as
          // an absolutely-pinned suffix plus 32px of reserved padding — chrome
          // sized for a comfortable form field, not a 30px cell. In this box
          // the unit is the BOX's to say (it is in `showDraft`, and the strut
          // reserves its width); handing it to the control too would either
          // eat the digits with padding or overlap them without it.
          control: (props) => (
            <NumberFieldEditor {...props} min={cfg.min} max={cfg.max} />
          ),
          // The same figure the read face shows — `number` displays and types
          // in one representation, which is exactly why it never exposed this.
          showDraft: (draft) => (
            <span className="tabular-nums">
              {draft === null ? "" : `${draft}${cfg.unit ?? ""}`}
            </span>
          ),
          draft: (value) => value,
          // The draft boundary's reason to exist: an emptied field is a real
          // draft (null), never zero — and never committable as is.
          commit: (draft) =>
            draft === null ? null : inRange(draft, cfg.min, cfg.max),
        },
      }),

    duration: (cfg) =>
      render<number, number | null>(cfg.edits as string, {
        show: (value) => <Duration seconds={value} />,
        edit: {
          // No `unit` — see `number` above. The box says "120s"; the control
          // it holds types the digits.
          control: (props) => (
            <NumberFieldEditor {...props} min={cfg.min} max={cfg.max} />
          ),
          // THE pair whose two representations genuinely differ, and the reason
          // `showDraft` exists at all: an SLA target READS as "2m" and TYPES as
          // "120". Sizing the box from `show` clipped the live control down to
          // its own unit suffix — the operator saw "[s]" and no number.
          showDraft: (draft) => (
            <span className="tabular-nums">
              {draft === null ? "" : `${draft}s`}
            </span>
          ),
          draft: (value) => value,
          commit: (draft) =>
            draft === null ? null : inRange(draft, cfg.min, cfg.max),
        },
      }),

    enum: (cfg) =>
      render(cfg.edits as string, {
        // The option's label IS the shown value — declare it once, and rich
        // labels are welcome: pass the display primitive and the picker
        // previews exactly what the cell will render.
        show: (value: string) =>
          cfg.options.find((option) => option.value === value)?.label ?? value,
        edit: {
          control: (props) => <EnumSelect {...props} options={cfg.options} />,
          // The option's label — the same node `show` renders, by construction.
          showDraft: (draft: string) =>
            cfg.options.find((option) => option.value === draft)?.label ??
            draft,
          draft: (value: string) => value,
          commit: (draft: string) => draft,
          popup: true,
        },
      }),

    multiselect: (cfg) => {
      // ONE renderer, referenced twice — not two copies that happen to match.
      // A membership list reads and types identically, so `show` and
      // `showDraft` are literally the same function here; writing it out twice
      // is how the incumbent's faces drifted in the first place.
      //
      // A COMMA, not the middot the incumbent type used. The middot separates
      // things of DIFFERENT kinds ("Breached · 55s over", "In meeting · 25m",
      // "1 available · 1 recoverable") — two facts sharing a line. A membership
      // list is one kind of thing repeated, and the repo already punctuates
      // exactly this list exactly this way (queue-coverage.tsx: `also covers
      // ${names.join(", ")}`), so a middot here would make two views of the
      // same queue names disagree. It reads better too: the middot is
      // aria-hidden by convention, which leaves a screen reader saying
      // "Billing Tier 2" — a comma it actually announces.
      const showMembers = (members: readonly string[]) => {
        const selected = cfg.options.filter((o) => members.includes(o.value))
        if (selected.length === 0) return null
        return (
          <span className="inline-flex flex-wrap items-center gap-x-1">
            {selected.map((option, i) => (
              <span key={option.value} className="inline-flex items-center">
                {option.label}
                {i < selected.length - 1 && ","}
              </span>
            ))}
          </span>
        )
      }
      return render(cfg.edits as string, {
        show: showMembers,
        edit: {
          control: (props) => (
            <MultiSelectFieldEditor {...props} options={cfg.options} />
          ),
          showDraft: showMembers,
          draft: (value: readonly string[]) => [...value],
          commit: (draft: string[]) => draft,
          popup: true,
        },
      })
    },
  }
}
