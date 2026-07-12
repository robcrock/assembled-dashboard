---
name: vercel-composition-patterns
description: React composition patterns that scale, mapped to this repo's living examples — use when refactoring boolean-prop soup, designing component APIs, or reviewing component architecture. React 19 rules apply (this repo is React 19).
---

# React Composition Patterns (project variant)

The generic doctrine — avoid boolean prop proliferation, compound components
over config, children over render props — is already this repo's **Component
API discipline** (CLAUDE.md). This variant maps each pattern to the shipped
precedent, so refactors cite living code instead of abstract rules.

## When to Apply

- refactoring a component whose props are becoming boolean soup
- designing a new primitive's public API (the prop API is a first-class
  deliverable here — including the props deliberately omitted)
- reviewing component architecture or a PR that adds context/compound machinery

## The patterns, with repo precedent

- **Avoid boolean props → discriminated unions.** `StatusBadge` takes
  `status: healthy | at_risk | breached | ...`, not `isBreached`/`isAtRisk`.
  `StatCard` takes `variant: card | plain` and `size: default | lg`; feed state
  travels as ONE `feed` value object, not `isLoading`/`isError`/`isStale` flags.
- **Explicit variants over boolean modes.** When behavior forks, fork the
  union (`variant`), not a `plain?: boolean`.
- **Children over render props — without exception.** `StatCard`'s trend slot
  is children (a `renderTrend` prop was deliberately rejected); `Gauge` owns
  only the arc and takes center content as children, never a formatter prop.
  Alarm ink is the consumer's tinted value node, never a color prop.
- **Compound components / context only where shared state earns it.** The two
  sanctioned sites: `DataTable` (one sort tuple — and even that is a single
  component, not a compound family) and the `useDashboardData` store. Leaf
  primitives get neither. New context requires the same justification.
- **Lift state along the ownership ladder, not into components.** store
  (fetch/replay/staleness) → template (page UI state) → organism (per-slice
  derivation) → molecule/atom (stateless, or one self-contained interaction).
  If a refactor wants sibling components to share state, the state moves UP
  the ladder — components below the template never fetch.
- **Decouple state implementation.** Consumers see `{ data, status,
  lastUpdatedAt }` — only the store knows data comes from a replayed fixture.
  Keep it that way through any refactor.
- **React 19 (applies here).** No `forwardRef` — `ref` is a normal prop; use
  `use()` over `useContext()`. Don't over-memoize.

## Workflow

1. Name the smell (boolean soup? renderX prop? context on a leaf?).
2. Find the repo precedent above and shape the refactor to match it.
3. Check the seam: does TypeScript still enforce model-union ↔ prop-union
   agreement where the section maps model onto props?
4. Update the component's Storybook docs — if a prop was removed or an omission
   is now deliberate, the docs page records it (omissions are load-bearing API).

## Verify

- `pnpm lint && pnpm typecheck`; affected stories still render every state.
- The public API got smaller or clearer — never a new boolean, renderX, or
  color prop.
