// The cell's edit machine: what an open edit IS, how it moves, and when it
// becomes a patch. Pure TS by design, not by accident — no React import, no
// DOM, no rendering. Every rule below is therefore checkable in a unit test
// rather than by clicking a table and squinting, which is the whole reason
// the states were pulled out of the renderer in the first place.
//
// THE SLOT IS PURE DATA. It holds an address and a draft: no row, no
// closures, no capability. The behavior and the current truth ride on the
// EVENTS instead, read fresh at the moment of the gesture. That split is
// load-bearing twice over — a poll tick re-mints every capability closure, so
// state that retained one would be holding a stale twin of the live thing;
// and a draft that outlives a tick must not pin the row it was seeded from.
//
// ADDRESSES ARE STRINGS, never row identity. The table is fed a whole new
// Queue[] every poll, so `row === slot.row` is false a tick after the click,
// and an identity-keyed draft would evaporate under the caret.
//
// ONE SLOT, so two open edits are UNREPRESENTABLE rather than merely
// discouraged. "One cell edits at a time" is an invariant across siblings; no
// cell can hold it, so no cell is asked to.
//
// The machine NEVER MUTATES. A commit leaves as a patch intent and the
// consumer decides what it means — undo, confirmation, the optimistic
// overlay are all policy above this layer.

/**
 * Where an edit lives. Three strings, because a cell may hold more than one
 * editable content (the compound cells hold a figure beside a read-only
 * twin), so the column alone doesn't address it.
 *
 * Known gap, deliberate: two contents editing the SAME key in one cell share
 * an address and would both open. Nonsense markup, visible instantly, no data
 * corruption — and the alternative (a `useId` address) buys the fix with an
 * address no one can read in devtools.
 */
export interface ContentAddress {
  rowKey: string
  columnKey: string
  /** Distinguishes contents within one cell — the row key they edit. */
  key: string
}

export function sameAddress(a: ContentAddress, b: ContentAddress): boolean {
  return a.rowKey === b.rowKey && a.columnKey === b.columnKey && a.key === b.key
}

/**
 * The behavioral half of an edit capability — everything this machine needs
 * and nothing it doesn't. The rendering half (`show`, `control`) lives in
 * cell-content.tsx, whose `EditCapability` extends this.
 *
 * The dependency points this way on purpose: the state machine depends on
 * BEHAVIOR, not on rendering, which is what keeps this file React-free and
 * testable in node.
 */
export interface EditBehavior<V, Draft> {
  /** Seed the edit from the current truth. */
  draft: (value: V) => Draft
  /** Land the draft as a value — `null` means "not a value yet". */
  commit: (draft: Draft) => V | null
  /**
   * The control's popup renders outside the box, so focus legitimately leaves
   * into a portal and blur carries no meaning. AG Grid's `cellEditorPopup`.
   */
  popup?: boolean
}

/**
 * The open edit. Owned by the table (one, or none), addressed by strings,
 * carrying the draft as `unknown` — the slot is heterogeneous by nature since
 * every column drafts a different shape. Type safety is established at the
 * builder, where the value type is still known; re-asserting it here would be
 * a cast wearing a generic.
 */
export interface EditSlot {
  address: ContentAddress
  draft: unknown
}

/**
 * What a cell IS right now. Three arms, because "no box", "a box", and "a box
 * with a live control in it" are three visibly different things and collapsing
 * any two of them is how a cell starts lying about what a click will do.
 *
 * `reading` is not "not editable" — a cell with a capability still reads as
 * `reading` until the table enters edit mode. Mode gates the box.
 */
export type CellState<
  V,
  Draft,
  E extends EditBehavior<V, Draft> = EditBehavior<V, Draft>,
> =
  | { state: "reading" }
  | { state: "editable"; edit: E }
  | {
      state: "editing"
      edit: E
      draft: Draft
      /** `commit(draft)` yields a value. False paints aria-invalid and Enter holds. */
      committable: boolean
    }

/* The value and draft types are read OFF the capability rather than asked for
 * separately: `edit` is the only argument that knows both, so it's the only
 * honest inference site. Given `{ draft: (v: number) => number | null }`, the
 * `value` argument is then checked as number and the draft surfaces as
 * `number | null` — with no call site ever writing a type argument.
 *
 * `any` in the constraint is load-bearing, not laziness: EditBehavior is
 * contravariant in both parameters (`draft` takes V, `commit` takes Draft), so
 * `any` is its only universal supertype — `unknown`/`never` reject every real
 * capability. Same reason the incumbent wrote `ColumnType<any, any>`. */
/* eslint-disable @typescript-eslint/no-explicit-any -- see above: the only supertype of a doubly-contravariant type */
type AnyEdit = EditBehavior<any, any>
type EditValue<E> = E extends EditBehavior<infer V, any> ? V : never
type EditDraft<E> = E extends EditBehavior<any, infer Draft> ? Draft : never
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Project a cell's state. `edit` is REQUIRED: a content with no edit
 * capability never asks for a state, because it doesn't have one — the
 * read-only cells don't *skip* the editing branch, they have none to skip.
 * That's the difference between this and a `readOnly` flag somebody forgets.
 */
export function cellState<E extends AnyEdit>(args: {
  edit: E
  /** The table's edit mode. Capability without mode still reads. */
  mode: boolean
  value: EditValue<E>
  address: ContentAddress
  slot: EditSlot | null
}): CellState<EditValue<E>, EditDraft<E>, E> {
  const { edit, mode, address, slot } = args
  if (!mode) return { state: "reading" }
  if (!slot || !sameAddress(slot.address, address)) {
    return { state: "editable", edit }
  }
  // The one cast in the machine, and the reason it's confined here: the slot
  // is heterogeneous (`unknown`) because the table holds ONE of them across
  // columns that draft different shapes. This is where the value type is known
  // again, so this is where it's restored.
  const draft = slot.draft as EditDraft<E>
  return {
    state: "editing",
    edit,
    draft,
    committable: edit.commit(draft) !== null,
  }
}

/**
 * The gestures. `commit` carries `via` because the three ways to ask are not
 * the same question: Enter is a deliberate assertion (a bad draft HOLDS, so
 * the operator sees why), while blur and pick are departures (a bad draft
 * reverts rather than blocking an exit nobody can see they're blocked from).
 *
 * `value` is the current truth, read at the gesture — there is no `value`
 * prop that could disagree with the row.
 */
export type CellEvent<V, Draft> =
  | {
      type: "open"
      address: ContentAddress
      behavior: EditBehavior<V, Draft>
      value: V
    }
  | { type: "change"; address: ContentAddress; draft: Draft }
  | {
      type: "commit"
      address: ContentAddress
      behavior: EditBehavior<V, Draft>
      value: V
      via: "enter" | "blur" | "pick"
    }
  | { type: "cancel"; address: ContentAddress }

/** The next slot, plus the intent it produced. `patch` is null far more often than not. */
export interface CellTransition<V> {
  /** null closes the edit. */
  slot: EditSlot | null
  /** A real change worth telling the consumer about. */
  patch: { value: V } | null
}

/**
 * Every transition, in one place. Total by construction: an event for an
 * address that isn't open is a no-op rather than an error, because a stray
 * blur from a unmounting control is normal and shouldn't be a crash.
 */
export function reduceCell<V, Draft>(
  slot: EditSlot | null,
  event: CellEvent<V, Draft>
): CellTransition<V> {
  if (event.type === "open") {
    return {
      slot: {
        address: event.address,
        draft: event.behavior.draft(event.value),
      },
      patch: null,
    }
  }

  // Not the open cell? Nothing happened. Covers the stray blur from a control
  // being torn down, and the second cell's events during a replace.
  if (!slot || !sameAddress(slot.address, event.address)) {
    return { slot, patch: null }
  }

  if (event.type === "cancel") return { slot: null, patch: null }

  if (event.type === "change") {
    return { slot: { address: slot.address, draft: event.draft }, patch: null }
  }

  // A popup control's focus lives in a portal, so blur is noise. The renderer
  // already declines to attach the listener; this makes the machine honest on
  // its own rather than trusting the renderer to keep that promise.
  if (event.via === "blur" && event.behavior.popup) {
    return { slot, patch: null }
  }

  const value = event.behavior.commit(slot.draft as Draft)

  if (value === null) {
    // Enter on a draft that isn't a value yet: HOLD. Staying open with
    // aria-invalid is the only way the operator learns why — closing would
    // silently discard what they typed.
    if (event.via === "enter") return { slot, patch: null }
    // Blur or pick: revert to truth. The cell repaints from the row rather
    // than inventing a 0 out of an emptied field.
    return { slot: null, patch: null }
  }

  // A patch is a real intent, never an echo.
  if (unchanged(value, event.value)) return { slot: null, patch: null }

  return { slot: null, patch: { value } }
}

/**
 * Drop an edit whose row left the feed. Pure, and called in render: a row can
 * vanish on any tick, and a draft addressed to a row that no longer exists
 * would commit into nothing.
 */
export function projectEdit(
  slot: EditSlot | null,
  liveRowKeys: ReadonlySet<string>
): EditSlot | null {
  if (!slot) return null
  return liveRowKeys.has(slot.address.rowKey) ? slot : null
}

/**
 * Did a commit actually change anything? Reference equality is wrong here and
 * shipped as a bug: a multi-select mints a NEW array every render, so an
 * untouched membership list compared `!==` its own truth and emitted a phantom
 * patch on every close. One shallow step is enough — every value that reaches
 * a cell is a scalar or a flat list of them, and a deep compare would be
 * answering a question this system doesn't ask.
 */
export function unchanged(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => Object.is(item, b[i]))
  }
  return Object.is(a, b)
}
