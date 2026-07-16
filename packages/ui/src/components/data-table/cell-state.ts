// The cell's edit machine: what an open edit IS, how it moves, and when it
// becomes a patch. Pure TS — no React, no DOM.
//
// The invariants a caller may rely on:
//   - ONE slot, so two open edits are unrepresentable.
//   - The slot is pure data — an address and a draft. Behavior and the current
//     truth ride on the events, read fresh at the gesture.
//   - Addresses are strings, never row identity: the table is fed a whole new
//     row array every poll.
//   - Nothing here mutates. A commit leaves as a patch INTENT; what it means is
//     the consumer's policy.
//
// Why each of those is the way it is: the `cell state` docs page.

/**
 * Where an edit lives. Three strings and not two: a cell may hold more than one
 * editable content, so the column alone doesn't address it.
 *
 * Deliberate gap — two contents editing the SAME key in one cell share an
 * address and both open. Nonsense markup, visible instantly, no data
 * corruption.
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
 * The behavioral half of an edit capability — everything this machine needs and
 * nothing it doesn't. The rendering half (`show`, `control`) lives in
 * cell-content.tsx, whose `EditCapability` extends this.
 */
export interface EditBehavior<V, Draft> {
  /** Seed the edit from the current truth. */
  draft: (value: V) => Draft
  /** Land the draft as a value — `null` means "not a value yet". */
  commit: (draft: Draft) => V | null
  /**
   * The control's popup renders outside the box, so focus legitimately leaves
   * into a portal and blur carries no meaning.
   */
  popup?: boolean
}

/**
 * The open edit. Carries the draft as `unknown` because the table holds ONE of
 * these across columns that draft different shapes; the type is restored at the
 * builder, where the value type is still known.
 */
export interface EditSlot {
  address: ContentAddress
  draft: unknown
}

/**
 * What a cell IS right now. Three arms, because "no box", "a box", and "a box
 * with a live control in it" are three visibly different things.
 *
 * `reading` is not "not editable" — a cell with a capability still reads as
 * `reading` until editing is permitted. Permission gates the box.
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

/* `any` is load-bearing, not laziness: EditBehavior is contravariant in both
 * parameters (`draft` takes V, `commit` takes Draft), so `any` is its only
 * universal supertype — `unknown`/`never` reject every real capability. */
/* eslint-disable @typescript-eslint/no-explicit-any -- see above: the only supertype of a doubly-contravariant type */
type AnyEdit = EditBehavior<any, any>
type EditValue<E> = E extends EditBehavior<infer V, any> ? V : never
type EditDraft<E> = E extends EditBehavior<any, infer Draft> ? Draft : never
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Project a cell's state. `edit` is REQUIRED: a content with no edit capability
 * never asks for a state, because it doesn't have one — read-only cells don't
 * skip the editing branch, they have none to skip.
 *
 * V and Draft are read OFF the capability rather than asked for separately:
 * `edit` is the only argument that knows both, so it's the only honest
 * inference site — and no call site ever writes a type argument.
 */
export function cellState<E extends AnyEdit>(args: {
  edit: E
  /**
   * May this value be changed right now — every gate the consumer applies,
   * already resolved to one answer by the caller. Today that is the table's
   * edit mode; a row-level or per-key rule would be `&&`-ed in at the same
   * site and this machine would not notice, which is the seam working.
   */
  permitted: boolean
  value: EditValue<E>
  address: ContentAddress
  slot: EditSlot | null
}): CellState<EditValue<E>, EditDraft<E>, E> {
  const { edit, permitted, address, slot } = args
  if (!permitted) return { state: "reading" }
  if (!slot || !sameAddress(slot.address, address)) {
    return { state: "editable", edit }
  }
  // The one cast in the machine, and the reason it's confined here: this is
  // where the value type is known again, so this is where it's restored.
  const draft = slot.draft as EditDraft<E>
  return {
    state: "editing",
    edit,
    draft,
    committable: edit.commit(draft) !== null,
  }
}

/**
 * The gestures.
 *
 * `via` distinguishes them because the three ways to ask are not the same
 * question: Enter is a deliberate assertion (a bad draft HOLDS, so the operator
 * sees why), while blur and pick are departures (a bad draft reverts rather
 * than blocking an exit nobody can see they're blocked from).
 *
 * `value` is the current truth, read at the gesture — there is no `value` prop
 * that could disagree with the row. `commit` likewise carries the draft it
 * means rather than letting the machine read the slot, because a picker emits
 * its change and its commit in one tick and the slot is a render behind by
 * construction.
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
      /** The draft to land — the freshest the gesture saw, not the slot's. */
      draft: Draft
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
 * address that isn't open is a no-op rather than an error, because a stray blur
 * from an unmounting control is normal and shouldn't be a crash.
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

  // Not the open cell? Nothing happened.
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

  const value = event.behavior.commit(event.draft)

  if (value === null) {
    // Enter on a draft that isn't a value yet: HOLD, so the operator learns
    // why rather than watching what they typed vanish. Hold the EVENT's draft.
    if (event.via === "enter") {
      return {
        slot: { address: slot.address, draft: event.draft },
        patch: null,
      }
    }
    // Blur or pick: revert to truth rather than inventing a 0 from an emptied
    // field.
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
 * Did a commit actually change anything? Arrays compare member-wise, not by
 * reference: a multi-select mints a new array every render, so an untouched
 * membership list would otherwise compare `!==` its own truth and emit a
 * phantom patch on every close. One shallow step is enough — every value that
 * reaches a cell is a scalar or a flat list of them.
 */
export function unchanged(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => Object.is(item, b[i]))
  }
  return Object.is(a, b)
}
