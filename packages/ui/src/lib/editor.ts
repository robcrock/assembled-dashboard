// The shared contract every editor primitive speaks — the EDIT face that
// pairs with a display primitive's view face over the same value union
// (TextFieldEditor ↔ text, NumberFieldEditor ↔ metric cells, EnumSelect ↔
// StatusBadge-class enums, MultiSelectFieldEditor ↔ membership lists).
//
// Editors are deliberately COMMIT-POLICY-AGNOSTIC: they translate explicit
// user intents (Enter → onCommit, Escape → onCancel) but never decide WHEN a
// value is saved — the container supplies the policy. That one decoupling is
// what lets the same editor serve an inline table cell (commit on Enter/blur,
// container-owned), a batched row form (one Save button; per-field onCommit
// simply not passed), and any future surface: no commit affordance is baked
// in. Blur handling in particular belongs to the CONTAINER (a focusout on
// its wrapper) — commit-on-blur in one surface would be a bug in another.
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
