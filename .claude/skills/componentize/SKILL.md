---
name: componentize
description: Extract and organize existing UI in this repo into reusable components with thoughtful APIs — deciding the packages/ui vs feature-slice seam first, then following the folder-per-component conventions.
---

# Componentize (project variant)

Use this when UI code in this repo needs to be extracted, deduplicated, or
reorganized into components. This variant bakes in the repo's load-bearing
seam and conventions; the generic extraction instincts still apply underneath.

## Activation

### Use For

- extracting repeated UI in `apps/web` or `packages/ui` into components
- promoting a page-baked pattern into a proper primitive or composition
- splitting a large component file into focused modules
- turning a prototype into code that fits the repo's structure

### Do Not Use For

- brand-new design work (use `design`)
- responsive-only or visual-polish-only changes
- pure logic extraction with no component boundary (that's a `lib/` or `model/` move)

## Decide the seam FIRST

Every extraction answers one question before any code moves: **is this
domain-agnostic or domain-bound?**

- **Domain-agnostic** (takes value objects; has never heard of a queue) →
  primitive in `packages/ui/src/components/<name>/` — only if it earns a spot
  in the sharp set (~8–10 primitives, not 30). A one-consumer helper is not a
  primitive yet.
- **Domain-bound** (takes entities like `Queue[]`, `Agent[]`) → composition in
  `apps/web/features/<slice>/components/`. Slices never reach into each other's
  internals; anything two slices need moves to `lib/`.
- **Pure logic** (formatting, derivation) → `packages/ui/src/lib/` if primitives
  tick it, `apps/web/features/*/model/` if domain derivation. **No React imports
  in either.**

## Repo conventions (non-negotiable)

- Folder per component: `<name>/<name>.tsx` + colocated `<name>.stories.tsx` +
  `index.ts` (`export * from "./<name>"`). File names kebab-case, exports PascalCase.
- Import primitives as `@workspace/ui/components/<name>` — never a deep path,
  never a barrel. `cn` comes from `@workspace/ui/lib/utils` (it's
  `extendTailwindMerge`-aware; plain clsx would silently drop custom `text-*` composites).
- No margins baked into components — spacing belongs to the call site; every
  component accepts `className` and merges it. On status surfaces, the canonical
  tint merges LAST so `className` can adjust layout but never re-tint.
- Discriminated `status`/`state`/`variant` unions, not boolean soup. Children
  over `renderX` props. Compound/context machinery only where shared state
  justifies it — never on leaf primitives.
- Components below the template never fetch; data + `feed` status arrive as props.
- Tokens at the semantic tier or above — no raw hex, no `--primitive-*`.

## Workflow

1. Read the existing component inventory (CLAUDE.md table + Storybook sidebar)
   — reuse or extend before creating.
2. Decide the seam (above) and name the component in the ubiquitous language.
3. Extract; wire types across the seam (model unions must match prop unions).
4. New primitive? It also needs: a story per state (loading/empty/error/stale/
   interaction where applicable), `parameters.docs.description.component` with
   when-to-use AND deliberately-omitted props, and prop JSDoc.
5. Re-scan for leftover duplication.

## Verify

- `pnpm lint && pnpm typecheck` from the repo root.
- Original UI and behavior preserved (run the dashboard and the Storybook story).
- The dependency direction still holds: `@workspace/ui` imports no app or feature code.
