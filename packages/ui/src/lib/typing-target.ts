// Does this event target own its own keystrokes?
//
// Lives in lib because THREE surfaces need it and none of them can own it:
// DataTable's `x` (toggle selection from anywhere in a row), the dashboard's
// `p`/`e` replay levers, and the theme toggle's `d`. Every page-level hotkey
// has the same question — "is someone typing?" — and every copy of the answer
// is a chance to get it differently wrong. They already had: two of the three
// copies omitted the `combobox` case, so `x` and `d` fired while a picker had
// focus.
//
// Pure TS by the lib rule — no React. `HTMLElement` is a DOM lib type, not a
// framework one, the same way `lib/editor.ts` names a keyboard event
// structurally without importing React.

/**
 * True when the target is a control that owns its own keystrokes, so a
 * page-level single-key shortcut must stand down.
 *
 * `role="combobox"` is the case worth naming: a Base UI picker's trigger is a
 * BUTTON, not an input, so a tagName-only check waves it through and the
 * shortcut steals the key while the picker is open — which is exactly what a
 * typeahead needs to receive.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.getAttribute("role") === "combobox"
  )
}
