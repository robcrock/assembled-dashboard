---
name: ideas
description: Compare multiple UI options in-browser with the ui.sh picker, adapted to this repo — Next.js injection point, token-law-compliant variants, and picker scaffolding that never reaches a commit.
---

# Ideas (project variant)

Use this when the user wants to see and pick between multiple UI
implementations in the browser via the ui.sh picker. This variant pins the
repo-specific mechanics; the picker discipline is unchanged from the generic skill.

## Activation

### Use For

- scaffolding `data-uidotsh-pick` / `data-uidotsh-option` comparisons in `apps/web`
- injecting, verifying, or removing the picker toolbar
- asking the user to choose between visible options, then cleaning up

### Do Not Use For

- one definitive implementation with no comparison
- design-direction exploration without in-browser variants (use `design`)

## Repo mechanics

- **Injection point:** `apps/web/app/layout.tsx`, via `next/script` (a plain
  `<script>` in JSX can fail to execute in dev):

  ```tsx
  import Script from "next/script"
  // inside the body, after {children}:
  <Script src="https://ui.sh/ui-picker.js" />
  ```

  Inject once, never in leaf components. The dashboard page is the only page.
- **Run it with the Browser pane** (`web` config in `.claude/launch.json`,
  port 3000) — verify options toggle before asking for a selection.
- **Variants obey the system.** Every option must stay inside the token law
  (no raw hex, orange = breach only) and the type voices — the picker chooses
  between compositions, never between palettes that violate the color law.
- **Picker scaffolding never reaches a commit.** Options, `hidden` attributes,
  `contents` wrappers, and the script tag are all pre-commit artifacts; finish
  every round either fully cleaned or explicitly parked by the user.

## Workflow

1. If a prior round exists, reset first: remove unselected branches, stale
   `hidden` attributes, and leftover wrappers; keep at most one toolbar script.
2. Define decision points with human-readable labels (`Coverage panel layout`);
   when the current implementation is an option, it goes first, labelled
   `... (current)`.
3. Annotate: wrapper `data-uidotsh-pick="Label"`, options
   `data-uidotsh-option="Name"`, all nodes `className="contents"` so wrappers
   don't affect layout, exactly one option visible, the rest `hidden`.
4. Inject the toolbar (above), let the user preview, then ask for the selection
   with the question tool — one question per decision point, labels matching
   the picker, custom input left available.
5. Finalize: keep the selected variant, delete the rest, remove picker
   attributes/wrappers/`hidden` leftovers; remove script usage before its
   import so intermediate saves stay valid. Remove the toolbar itself when the
   user is done comparing.

## Verify

- Desktop and narrow widths; no duplicate `id`s across surviving markup.
- No picker artifacts remain (grep `uidotsh` returns nothing) unless another
  round is explicitly in flight.
- `pnpm lint && pnpm typecheck`.
