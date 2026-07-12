# CLAUDE.md

Guidance for Claude Code working in this repository. This is the single source of truth
for the project — the brief, the domain model, the stack rationale, and the working rules.

## What this is

A **real-time contact-center dashboard** — the page an operations manager keeps open on a
second monitor all morning to see, at a glance, whether the floor is healthy and where to
intervene. It must let someone answer:

- Which queues are healthy vs. at risk vs. breaching SLA right now?
- How is volume tracking against forecast?
- Which agents are out of adherence or in a state that needs attention?

The point of the exercise is **the component layer beneath the page** — a small, sharp,
well-documented set of reusable primitives (the ones the next ten Assembled pages would also
reach for), plus their states and design tokens. **The component library (`packages/ui`) is
the deliverable; the dashboard app is the proof.** Bias every call toward "fewer, sharper,
documented components" over breadth. For each primitive, the public prop API is a first-class
deliverable — document the props exposed *and* the ones deliberately omitted.

## Commands

Run from the repo root; everything goes through Turbo.

```bash
pnpm dev          # turbo dev — runs the web app (persistent, uncached)
pnpm build        # turbo build
pnpm lint         # turbo lint  — eslint across the workspace
pnpm typecheck    # turbo typecheck — tsc --noEmit across the workspace
pnpm format       # turbo format — prettier write
```

Add shadcn primitives from `apps/web`; they land in `packages/ui/src/components`:

```bash
cd apps/web && pnpm dlx shadcn@latest add <name>
```

Never re-init with `-b radix` — we take the Base UI default deliberately. Run `pnpm lint`
and `pnpm typecheck` before considering a change done.

## Stack (and why)

- **Turborepo 2.x + pnpm workspaces** (`pnpm@10`, Node ≥20). The deliverable is a reusable
  component layer, so we make reuse *structural*: the library is a real package
  (`@workspace/ui`) that a real app (`apps/web`) consumes across a package boundary — the way
  the "next ten pages" would. Turbo gives cached, parallel `build`/`lint`/`typecheck`.
- **Next.js 16 App Router** + React 19 + TypeScript (`apps/web`). We use Next for its
  App-Router structure and its **Route Handlers**: a local `GET /api/dashboard` serves the
  fixture, turning "poll a local fixture" into a real fetch/poll/stale/error surface with no
  backend. **We deliberately do NOT server-render live data** — the shell is a static Server
  Component, the live dashboard is a Client Component that fetches from the route handler.
  SSR of ticking data would fight the exact thing that matters: how components handle changing,
  late, and failed data on the client.
- **shadcn/ui on Base UI** (`@base-ui/react` — Base UI is the default backing, not Radix),
  style `base-nova`, `lucide` icons. shadcn puts the component *source in our repo* (we own
  every API), Base UI handles the hard a11y/interaction behavior, and the visual layer is
  entirely ours via tokens. shadcn's `--monorepo` support places base components in
  `packages/ui`.
- **Tailwind v4 + CSS-variable design tokens (oklch)** in `packages/ui/src/styles/globals.css`
  — semantic variables in `:root`/`.dark`, mapped via `@theme inline`. Light/dark falls out of
  the same token names. With Tailwind v4 the `tailwind` block in `components.json` stays empty.
- **next-themes** for the light/dark toggle.
- **Storybook 10** as the component catalog — its own workspace (`apps/storybook`,
  react-vite builder) that consumes `@workspace/ui` as a package, so it's a *second real
  consumer* of the library. Stories stay **colocated** inside their component's folder in
  `packages/ui` (see the folder-per-component convention below); the workspace just owns the
  `.storybook` config and points its stories glob at `../../packages/ui/src/**/*.stories.tsx`.
  Add `!**/*.stories.*` to the shared `build` task `inputs` in `turbo.json` so editing a story
  never busts the app build cache.

## Repository layout & where code goes

```
apps/web/                  # Next.js app — the dashboard (the "proof")
  app/                     # layout.tsx (static shell), page.tsx (composition root),
                           #   dashboard.tsx (the one Client boundary), api/dashboard/route.ts
  features/<slice>/        # concern-separated slices: queue-health, agent-adherence, summary
    components/            #   composes @workspace/ui primitives for this slice
    model/                 #   pure TS: types + derivation. NO React imports.
  hooks/                   # use-dashboard-data.ts (the live-data store) + dashboard-frame.ts (the wire types)
  lib/fixtures/            # dashboard_state.json — the fixture the route handler serves
apps/storybook/            # the component catalog — a second consumer of @workspace/ui
  .storybook/              # config; stories glob points back into packages/ui
packages/ui/               # THE component library — the deliverable
  src/components/<name>/   # one folder per primitive: <name>.tsx, <name>.stories.tsx, index.ts
  src/lib/                 # cross-cutting pure TS: utils (cn), duration, delta, feed
  src/styles/globals.css   # design tokens (:root / .dark, @theme inline)
packages/eslint-config/    # shared config
packages/typescript-config/# shared config
```

Duration/delta/feed formatting lives in `packages/ui/src/lib/` (primitives tick it), not in
`apps/web/lib/` — the app imports it from `@workspace/ui/lib/*` so there's one implementation.

Planned feature slices: `queue-health`, `agent-adherence`, `summary`. The fixture
(`dashboard_state.json`) belongs at `apps/web/lib/fixtures/`, where the route handler reads it.

**Do not create a `packages/domain` package.** The domain isn't named yet, so a package
boundary around it is premature (it would have exactly one consumer). Model code lives in
`apps/web/features/*/model`; it promotes to `packages/<context>` only once a slice earns a
settled name *and* a second consumer — a file move, not a rewrite. This is DDD-*lite*: we keep
a ubiquitous language and a typed model, and skip tactical ceremony (aggregates, repositories,
domain services) that only pays off on a transactional backend. There are no writes here.

## Load-bearing rules

**Dependency direction (enforce it):**
- `apps/web` and `apps/storybook` → `@workspace/ui`. `@workspace/ui` depends on
  **no app and no feature code** — primitives are domain-agnostic and define their own prop unions.
- Inside `apps/web`: `app/` (routes) → `features/` → `@workspace/ui` + `lib/`.
- `features/*/model` and `lib/` are **pure TS — no React, no component imports.**
- Slices never reach into each other's internals; anything two slices need moves to `lib/`.
- `app/page.tsx` is the composition root — it assembles the feature sections.

**The page-vs-component seam is a package boundary:** domain-agnostic primitives take value
objects (`StatusBadge` takes a `status`; it has never heard of a queue); domain-bound
compositions take entities (`QueueHealthTable` takes `Queue[]`) and live in feature slices.
TypeScript checks the seam — the model's `SlaStatus` union must match the primitive's `status`
prop where the section maps model onto props.

**Imports:** import primitives from the specific path — `@workspace/ui/components/<name>` —
never a barrel (matters across the package boundary). In `apps/web`, `@/*` maps to the app
root; `@workspace/ui/*` maps to `packages/ui/src/*`.

## Domain model (the ubiquitous language)

The same names are the design-token names, the prop enums, and the component names — so nothing
drifts between data, tokens, and UI. Model straight from the fixture:

- **Entities:** `Queue`, `Agent`, plus a floor-level `Summary` rollup.
- **`Queue`** carries an SLA concept (`sla_target_sec`, `longest_wait_sec`, `sla_status`,
  `sla_headroom_pct`), volume-vs-forecast (`volume_last_15m`, `volume_forecast_next_15m`,
  `volume_vs_forecast_pct`), staffing (`agents_available`, `agents_on_call`, `tickets_waiting`),
  and a `wait_trend_sec` series.
- **`Agent`** carries identity (`agent_id`, `name`), `queues[]` membership, a `state`, and an
  adherence concept (`adherence_status`, `out_of_adherence_since`, `out_of_adherence_sec`,
  `state_since`, `state_duration_sec`).
- **`Summary`:** `sla_attainment_pct`, `queues_total`, `queues_breaching`, `queues_at_risk`,
  `tickets_waiting_total`, `agents_total`, `agents_online`, `agents_out_of_adherence`.
- **Value concepts cutting across both:**
  - `SlaStatus` = `healthy | at_risk | breached`
  - `AdherenceStatus` = `adherent | out_of_adherence`
  - `AgentState` = `available | on_call | on_break | in_meeting | offline`
  - `Duration` (seconds → human), a **signed delta vs. a target** (semantic over/under
    direction), and **freshness** (tick `ts` vs. now — this is the stale state).

The pre-computed status/delta fields are a suggestion, not a constraint — the raw inputs
(`longest_wait_sec`, `sla_target_sec`, …) are all present if we'd rather classify ourselves.
If the design wants data that isn't there, stub or extend it and say what was added.

## The fixture

`dashboard_state.json` is the shape a metrics API would hand the frontend: fully pre-computed.
Two parts:

- **`current`** — the live snapshot for "now" (mid-morning, `ts` = `2026-05-26T14:45:00Z`). The
  single object a static render would consume.
- **`history`** — the last several ticks (every 5 minutes) leading up to now, same shape. Drives
  sparklines/trends, or replay it on a timer to simulate live updates.

Each frame has `ts`, a top-level `summary`, a `queues[]` array (6 queues), and an `agents[]`
array (13 agents). The data carries a **deliberate, legible narrative** the design should tell
clearly, and the description below matches the shipped `dashboard_state.json`: in the current
snapshot **`billing` and `chat` are both breached** (each running ~25% over forecast, each
short an agent), **`vip` is at risk** and recovering from a spike, and `tier_2` / `onboarding`
/ `general` are **healthy**. **Three agents are out of adherence** — Alex (25m in an unplanned
meeting, on VIP), Jordan (15m on an unplanned break, on Billing + Tier 2), and Omar (10m on
break, on Chat) — so each breach traces to a missing, named agent. All three SLA statuses and
both adherence states appear in the current snapshot.

## Design tokens

Everything visual routes through tokens in `packages/ui/src/styles/globals.css`. **No raw hex,
no magic spacing, no ad-hoc colors in component code. Components never branch on theme** —
light/dark lives entirely in tokens. `dark:` variant classes are the normal Tailwind idiom
and are fine (icon swaps, alpha tweaks, vendored shadcn internals); the rule's teeth are
that theme-specific *color values* live in the token layer — a component never introduces
its own per-theme raw colors.

- **Inherited from shadcn** (semantic, oklch, `:root` + `.dark`): `background/foreground`,
  `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`,
  `input`, `ring`, `chart-1…5`, and the `--radius` scale. The surface/`-foreground` pairing is
  the rule: a surface token sets the background, its `-foreground` sets text/icon on it.
- **Domain tokens we add** (the ubiquitous language becomes CSS):
  - Reserved accent: `--sla-breach` (+ `-foreground` + `-bg`) — the palette's one loud color,
    spent on exactly one meaning: a broken promise. `--status-breached` is a semantic **alias**
    of `--sla-breach`, and `out_of_adherence` (the agent-side schedule breach) resolves to it
    too — so a red pixel anywhere on the page reads as "a promise is broken," and breach can't
    drift. Everything else leans on glyphs + calmer inks; deltas are colorless.
  - Status: `--status-healthy`, `--status-at-risk`, `--status-breached` (+ `-foreground` and a
    subtle `-bg` tint each) — one canonical scale used by *every* status surface (badges,
    cards, rows, meters, bars) so nothing drifts.
  - Adherence: `--adherence-ok`, `--adherence-out`.
  - A small type ramp with **tabular figures** (`font-variant-numeric: tabular-nums`) for dense,
    ticking metrics.

Ship a `ThemeToggle` so light/dark is demonstrably real.

## Component inventory — the sharp set

Primitives are domain-agnostic and live in `@workspace/ui` (aim for ~8–10, not 30);
compositions wire them to this dashboard's data and live in `apps/web` feature slices.

**Primitives — `packages/ui`:**
- `StatusBadge` / `StatusDot` — `status: healthy | at_risk | breached` (+ the adherence pair).
  One canonical `STATUS_META` map turns a status into glyph + label + color (`ink`, `badge`,
  `fill`); every status surface derives from it (`statusTextClass`, `statusFillClass`) so nothing
  drifts. Status reads by **glyph shape first, color second**. `StatusDot` renders the standalone
  glyph. **No per-call color props.**
- `StatCard` — headline number + label + optional `delta` + optional trend slot (via children,
  not a `renderTrend` prop). Handles loading/empty/error/stale internally via one `feed` prop.
- `MetricDelta` — signed value + unit, rendered **colorless**: the explicit +/− sign carries
  direction (no arrows/glyphs), muted ink keeps it an annotation. No `invert` prop, no verdict
  color — **without exception**: even the queue table's headroom percent stays neutral, since
  that row's SLA verdict already lives in its Status badge. Verdict color rides on the status
  surfaces (badges, `Sparkline` tint) alone; red is reserved for breach.
- `Sparkline` — line trend; `status`-tinted, accessible aria-label. (Catalog primitive — its
  summary-strip consumer was replaced by the gauge overview.)
- `Gauge` — one normalized value (0–100) as an open-bottom arc; center content via children
  (the gauge owns only the arc, never number formatting). Muted track + `currentColor` value
  arc — no gradient, no threshold zones, no needle, no animation. The dashboard's org-level
  SLA-attainment reading.
- `SparkBars` — bar trend for `wait_trend_sec` in the queue table; bars past a `threshold` take
  the reserved breach accent, the rest stay muted (the tint is not overridable).
- `Meter` — normalized 0→max fill for utilization-type saturation; tint from the one canonical
  `statusFillClass` (never a fourth severity color).
- `DeviationBar` — signed deviation around a center baseline dot (the target): over extends
  right, under extends left, sign IS the direction (no `invert` prop). Deliberately
  **colorless** — one neutral muted fill, no status tint (verdict lives on the badges beside
  it); `range` clamp per half; no rendered number (the exact figure rides beside it). This is
  the queue table's headroom and volume visualization; contrast with `Meter`, which answers
  saturation, not distance-from-target.
- `DataTable` — dense, sortable, keyboard-navigable; queues and agents via generic column config.
  Owns loading/empty/error/stale. Optional expandable rows (`getExpandedContent` + `expandLabel`,
  `aria-controls`-linked). A single component, not compound — the only shared state is one sort tuple.
- `Duration` — formats `state_duration_sec` / `out_of_adherence_sec` as a semantic `<time>`.
  (`RelativeTime` deliberately not built; `StaleIndicator` is the only wall-clock surface.)
- State primitives: `Skeleton`, `EmptyState`, `ErrorState`, `StaleIndicator` (last-updated +
  degraded styling).
- `ThemeToggle`.

**Compositions — `apps/web` feature slices:** `AttainmentOverview` (`features/summary` — the
SLA-attainment gauge; it replaced the old `SummaryBar` KPI strip, and the section-level alarm
counts render as `AlarmStat` tiles in the composition root beside it), `QueueHealthTable`
(`features/queue-health`), `AgentAdherenceTable` (`features/agent-adherence`).

**Component API discipline:** discriminated `state`/`status` props, not boolean soup. Children
over `renderX` props. Compound-component/context machinery only where shared state justifies it
(`DataTable`, the data store) — never on leaf primitives. Don't over-memoize.

## States every component must handle

Each primitive gets a Storybook story per state:

- **Loading** — skeleton matching final layout (no layout shift on resolve).
- **Empty** — a deliberate empty state, not a blank div.
- **Error** — failed load, with a retry affordance where sensible.
- **Stale** — data present but the last tick is late; show "updated Xs ago" and degrade visually
  rather than lying it's live. The state most candidates skip — nail it.
- **Interaction** — hover, visible focus rings (use the `ring` token), full keyboard operability
  (tables sortable/navigable by keyboard).
- **Responsive** — the second-monitor case is wide, but degrade gracefully when narrow.
- **Density** — stay calm and legible under many rows of fast-moving numbers (tabular figures,
  restrained color, status reserved for what needs attention).

## Live-data model

Design as if live even if the render is static.

- A single `useDashboardData()` hook / small in-memory store (`apps/web/hooks/use-dashboard-data.ts`)
  exposes `{ data, status: 'loading' | 'live' | 'stale' | 'error', lastUpdatedAt }`.
- Data comes from the Next Route Handler (`app/api/dashboard/route.ts`) serving the fixture. The
  client **replays `history[]` on a timer** up to `current`, so sparklines and deltas actually
  move during a walkthrough.
- Simulate **late data** (mark `stale` when a tick doesn't arrive on schedule) and inject an
  **error** via a toggle (the route handler can return latency/500s), so failure paths are
  demonstrable.
- **Components receive data + status as props; they never fetch.** The store is the only place
  that knows *how* data is managed.

## Product thinking — what to surface

Design for triage, not completeness. Lead with what's wrong; let the healthy majority recede.

- Breaching/at-risk queues first, sorted by severity; healthy queues collapse or de-emphasize.
- Volume vs. forecast as a first-class signal (over-forecast is the leading indicator of the
  next breach). The queue table's Volume cell consolidates it with the same deviation anatomy
  as headroom — actual / forecast absolutes over a `DeviationBar` whose baseline dot is the
  forecast — fully **colorless** (every bar is neutral; here even the percent stays the stock
  muted `MetricDelta`): it's an indicator, not a verdict, so red keeps meaning only "a promise
  is broken."
- Out-of-adherence agents surfaced directly, with how long they've been out.
- Each queue row **expands to a coverage panel** (`features/queue-health/model/coverage.ts` +
  `queue-coverage.tsx`): who can help *this* queue — recoverable out-of-adherence agents skilled
  here, plus adherent cross-trained agents who could shift in. Show the lever, not just the fire.
- Make the fixture's narrative (billing + chat breached, vip recovering, healthy tail calm,
  three named agents out of adherence — each explaining a breach) tell clearly.
- Write down what you deliberately left out (drill-downs, historical reports, scheduling) and why.

## AI use

Reach for AI on scaffolding, boilerplate, Storybook stories across states, token tables, column
configs, refactors, and the domain type definitions. **Verify by hand** the parts easy to get
subtly wrong: accessibility semantics (roles, `aria-*`, focus order), keyboard interaction,
state handling (especially stale/error), token consistency (no stray hex), and contrast in
*both* themes. Verification pass: axe / Storybook a11y addon, keyboard-only pass on the tables,
contrast check on status colors light and dark, one story per state per component.

## Definition of done / submission

- Dashboard runs locally with one command (`pnpm dev`); live replay + stale + error demonstrable.
- The component catalog (Storybook) renders **every primitive across every state and variant**.
- `README.md`: how to run, stack rationale (incl. Next-without-SSR and the monorepo decision),
  the domain model / ubiquitous language, the token system, per-component API notes (props
  exposed vs. omitted), product tradeoffs, and AI notes.
- a11y + responsive pass done and noted. Repo shareable (public GitHub or zip).

## Conventions

- **File names: lowercase kebab-case everywhere** (`status-badge.tsx`, `sla-status.ts`,
  `use-dashboard-data.ts`). Exports stay `PascalCase` (`export function StatusBadge`).
- **Folder per component** in `packages/ui/src/components/`: `<name>/` contains the
  implementation (`<name>.tsx`), its colocated story (`<name>.stories.tsx`), and an `index.ts`
  top-level export (`export * from "./<name>"`). The package `exports` map targets
  `./src/components/*/index.ts`, so consumers always import `@workspace/ui/components/<name>`
  — never a deep file path. The library typechecks with `moduleResolution: "Bundler"` to match
  how it is actually consumed (Next/Turbopack and Vite), same as the app.

## Out of scope / anti-goals

- No SSR/RSC of live data, no auth/authorization/multi-tenancy, no real backend, no streaming
  infra, no deploy/CI/CD — all out of scope. Next's route handler over a local fixture is the
  whole plumbing story.
- No sprawling half-built component zoo. Fewer, sharper, documented.
- No throwaway one-offs baked into the page that should have been primitives.
- No heavyweight tactical DDD (aggregates/repositories/services) — the model is types + pure
  functions.
- No raw hex / magic spacing in components — everything through tokens. No component that
  branches on theme internally.
- No `@workspace/ui` dependency on the app or on feature code — primitives stay domain-agnostic.
- No premature `packages/domain` (or any bounded-context package) before the domain has a
  settled name and a second consumer.
