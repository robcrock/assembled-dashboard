// The shared contract every editor primitive speaks — the EDIT face that
// pairs with a display primitive's view face over the same value union
// (TextFieldEditor ↔ text, NumberFieldEditor ↔ metric cells, EnumSelect ↔
// StatusBadge-class enums, MultiSelectFieldEditor ↔ membership lists).
//
// Editors are deliberately COMMIT-POLICY-AGNOSTIC: they translate explicit
// user intents (Enter → onCommit, Escape → onCancel) but never decide WHEN a
// value is saved — the container supplies the policy. That one decoupling is
// what lets a single editor set serve grammars that genuinely disagree: a
// FIELD cell commits on Enter or focus-out, while a PICKER cell commits on
// pick/close and must ignore blur entirely (its focus legitimately leaves
// into a portal). Bake either policy in and the other becomes a bug. Blur
// handling in particular belongs to the CONTAINER (a focusout on its
// wrapper), and a surface that wanted to batch would simply not pass
// onCommit — no commit affordance is baked in here.
//
// Pure TS by the lib rule (no React import): the event parameter below is
// structurally compatible with React.KeyboardEvent without naming it.

export interface EditorProps<V> {
  /** The draft value. Owned by the container — editors are controlled. */
  value: V
  onChange: (next: V) => void
  /** Explicit save intent (Enter; a select's pick). Omit in batched forms. */
  onCommit?: () => void
  /** Explicit revert intent (Escape). The container restores the pre-draft value. */
  onCancel?: () => void
  /** Focus the control on mount — an editor opened by user gesture should receive focus. */
  autoFocus?: boolean
  disabled?: boolean
  /** Failed validation face: sets aria-invalid and the destructive ring. Message rendering is the container's. */
  invalid?: boolean
  id?: string
  /** Editors render unlabeled controls; the container names them (e.g. from the column header). */
  "aria-label"?: string
  /**
   * Styles the CONTROL — the input, or a picker's trigger — and must reach
   * whatever paints the border, never a positioning wrapper. Containers size
   * their editors through this (a table cell hands down a flush height and a
   * square radius), so an editor that parks it on a bare span silently drops
   * the request: a span paints no radius and no border, and the field below
   * keeps its stock look while the caller believes it was styled. Put it last
   * in `cn()` so the caller's utilities win the merge.
   */
  className?: string
}

/**
 * The one keyboard grammar all field editors share: Enter commits, Escape
 * cancels. Centralized so the grammar cannot drift between editors. Returns
 * a keydown handler; both intents preventDefault so a wrapping form doesn't
 * double-submit and an open popup doesn't double-close.
 */
export function editorKeyDown(
  onCommit?: () => void,
  onCancel?: () => void
): (event: { key: string; preventDefault: () => void }) => void {
  return (event) => {
    if (event.key === "Enter" && onCommit) {
      event.preventDefault()
      onCommit()
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault()
      onCancel()
    }
  }
}
