// The contract every editor primitive speaks — the edit face that pairs with a
// display primitive over the same value.
//
// Editors are COMMIT-POLICY-AGNOSTIC: they translate explicit intents (Enter →
// onCommit, Escape → onCancel) but never decide WHEN a value is saved. The
// container supplies the policy, which is what lets one editor set serve
// grammars that disagree — a field cell commits on Enter or focus-out, a picker
// cell commits on close and must ignore blur entirely. Blur belongs to the
// container; bake it in here and the picker becomes a bug.
//
// Pure TS by the lib rule: the event parameter is structurally compatible with
// React.KeyboardEvent without naming it.

export interface EditorProps<V> {
  /** The draft value. Owned by the container — editors are controlled. */
  value: V
  onChange: (next: V) => void
  /**
   * Explicit save intent (Enter; a picker's close), carrying the draft it
   * means. The draft rides on the intent because a picker can emit `onChange`
   * and `onCommit` in the same tick, leaving the container's rendered draft a
   * render behind — a container that had to reconstruct it would be
   * reconstructing a value this editor already holds. Omit in batched forms;
   * no commit affordance is baked in here.
   */
  onCommit?: (draft: V) => void
  /** Explicit revert intent (Escape). The container restores the pre-draft value. */
  onCancel?: () => void
  /**
   * The user's gesture was meant for this control — act as though they just
   * reached it. Each editor reads that in its own grammar: a FIELD takes the
   * caret, a PICKER opens its popup. A picker that merely took focus would
   * hand back a closed trigger that looks like the box just clicked, so the
   * gesture would appear to do nothing and every pick would cost two clicks.
   */
  autoFocus?: boolean
  disabled?: boolean
  /** Failed validation face: sets aria-invalid and the destructive ring. Message rendering is the container's. */
  invalid?: boolean
  id?: string
  /** Editors render unlabeled controls; the container names them (e.g. from the column header). */
  "aria-label"?: string
  /**
   * Styles the CONTROL — the input, or a picker's trigger — and must reach
   * whatever paints the border, never a positioning wrapper: a bare span paints
   * neither a radius nor a border, so parking it there drops the caller's
   * request silently. Put it last in `cn()` so the caller's utilities win the
   * merge.
   */
  className?: string
}

/**
 * The one keyboard grammar every field editor shares: Enter commits the draft,
 * Escape cancels. Centralized so the grammar cannot drift between editors.
 *
 * Both intents `preventDefault` — which is why the handlers stay optional
 * rather than being wrapped at the call site: a batched container omits
 * `onCommit` precisely because it wants Enter to stay native and submit the
 * form around it.
 */
export function editorKeyDown<V>(
  value: V,
  onCommit?: (draft: V) => void,
  onCancel?: () => void
): (event: { key: string; preventDefault: () => void }) => void {
  return (event) => {
    if (event.key === "Enter" && onCommit) {
      event.preventDefault()
      onCommit(value)
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault()
      onCancel()
    }
  }
}
