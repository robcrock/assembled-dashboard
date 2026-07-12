---
name: make-responsive
description: Adapt this dashboard's UI across breakpoints — the second-monitor-wide case is primary, narrow must degrade gracefully. Repo-aware audit order and rules.
---

# Make Responsive (project variant)

Use this when an existing surface in this repo misbehaves at some width. The
product context inverts the usual mobile-first framing: **the primary case is
a wide second monitor an ops manager keeps open all morning; narrow is the
degradation path** — it must stay legible and complete, not become a separate
mobile app. There is no mobile navigation to build (single-page dashboard).

## Activation

### Use For

- fixing overflow, wrapping, clipping, or cramped layouts at any width
- adapting a section or primitive that assumes wide viewports
- breakpoint-specific layout bugs in `apps/web` or a `packages/ui` primitive

### Do Not Use For

- new design work (use `design`) or extraction (use `componentize`)
- density/legibility issues that aren't width-related (that's the Density
  state — token ramp problem, not a breakpoint problem)

## Repo-aware rules

- **Sizing rides the documented ramps.** Never invent a size to fix a
  breakpoint — adjust with the existing `text-metric-*` / `text-label` /
  stock prose steps, and stock spacing (4px grid; no `gap-[13px]`).
- **Tables scroll, never crush.** `DataTable` owns its horizontal behavior —
  fix table overflow inside the primitive (its story catches regressions),
  not per call site. Table headers never wrap. Tabular figures keep columns
  stable while numbers tick.
- **Flex hygiene:** `min-w-0` on children that must shrink (truncating labels,
  fluid content beside fixed elements); `shrink-0` on glyphs, sparklines, and
  fixed controls so trend visuals never compress into noise.
- **Component-level responsiveness via container queries** (`@container`) for
  anything sized by its slot, not the viewport — stat tiles, the coverage
  panel, chart cells. Put the `@container` directly around the items.
- **Viewport units:** `min-h-dvh` family, never `min-h-screen`.
- **States survive narrowing.** Skeletons keep matching final layout at every
  breakpoint (no shift on resolve); the stale indicator and section headings
  stay visible — triage signal is never the thing that gets hidden.

## Workflow

1. Reproduce at the failing width first — Storybook viewport toggle for a
   primitive, the running dashboard (Browser pane, `web` config) for a section.
2. Audit in order: page shell/grid → section layout → tables → text/controls →
   flex overflow.
3. Fix at the right layer: primitive-owned behavior in `packages/ui` (story
   updated to cover it), composition layout in the feature slice.
4. Re-check wide FIRST (the primary case must not regress), then tablet, then
   narrow — and both themes if any structure swapped.

## Verify

- Browser pane at desktop / tablet / mobile presets: no horizontal body
  scroll, tables scroll internally, nothing clipped or crushed.
- Wide second-monitor layout unchanged unless the fix targeted it.
- `pnpm lint && pnpm typecheck`.
