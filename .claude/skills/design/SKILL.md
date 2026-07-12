---
name: design
description: Design and build new UI in this repo — the design-guideline system IS the repo's own token law, Braun brand layer, and Storybook rules pages. Load those, not generic taste.
---

# Design (project variant)

Use this when building new UI, sections, or components in this repo. The
guideline system here is not an external style guide — it's the repo's own
design system, and it is documented. **If a visual decision isn't derivable
from the sources below, the answer is to extend the token layer and document
it there, never to freelance in component code.**

## Activation

### Use For

- designing new UI, sections, or components for the dashboard
- adding a new surface that composes `@workspace/ui` primitives
- visual work that must sit correctly inside the Braun/dieter-grid brand layer

### Do Not Use For

- component extraction only (use `componentize`)
- responsive adaptation only (use `make-responsive`)
- comparing variants in-browser (use `ideas`)

## Load First — the guideline system

1. `CLAUDE.md` — Design tokens + Component inventory + States sections.
2. Repo-root `DESIGN.md` — the Braun spec (colors, type, radius, spacing, do's/don'ts).
3. Storybook rules pages (source in `packages/ui/src/docs/`): `token-tiers`
   (consumption rule), `color-law` (where color may be spent), `feed-states`
   (who owns loading/empty/error/stale).
4. Storybook `skills/choosing-a-data-primitive` before inventing any data
   surface — the decision table probably already names your component.

## The laws (short form)

- **Tokens only, semantic tier or above.** No raw hex, no `--primitive-*`
  outside `globals.css`, no magic spacing, no component that branches on theme.
- **The color law.** Orange means exactly one thing: a broken promise (SLA
  breach / out of adherence). Urgency ramp is grey → amber → orange. Deltas and
  deviation bars stay colorless; sentiment teal/red is reserved and unspent.
  Status reads by glyph shape first, color second.
- **Type has three voices.** Inter prose (weight ceiling 600), Inter tabular
  metrics (`text-metric-*`, weight cap 500), JetBrains Mono labels
  (`text-label`, always muted). Don't invent sizes; ride the documented ramps.
- **Braun-flat.** Radius 0/2/4px (larger utilities clamp to 4px), elevation by
  hairline border, never drop shadow, no gradients.
- **Every data surface handles its feed states** — loading skeleton matching
  final layout, deliberate empty, error with retry where sensible, stale dim
  (`stale-dim`) with honest "updated Xs ago". The stale state is the one most
  designs skip; don't.
- **Design for triage.** Lead with what's wrong; let the healthy majority
  recede via sort order and the quiet grey healthy register — never by muting
  whole data rows.

## Workflow

1. Load the guideline sources above; check the primitive inventory for what
   already exists.
2. Compose existing primitives first. A new primitive must earn its place
   (fewer, sharper, documented) — and gets stories + docs per `componentize`.
3. Implement with token utilities only; check both themes (`.dark` remaps
   semantics — primitives deliberately don't move).
4. Walk the states ladder and keyboard interaction (visible `focus-ring`).

## Verify

- `pnpm lint && pnpm typecheck`; run the dashboard and Storybook.
- Both themes, keyboard-only pass, contrast on any new status/ink pairing.
- Grep gate: no raw hex, no `primitive-` outside `globals.css`.
