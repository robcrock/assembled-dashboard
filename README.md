# Floor Status — real-time contact-center dashboard

The page an operations manager keeps open on a second monitor all morning: which
queues are breaching their SLA right now, whether volume is about to make it
worse, and where the missing capacity went. Designed for triage, not
completeness — a manager should assemble *"Billing is breaching because it's
over forecast and Jordan's off-schedule"* in about three seconds of glancing.

**The deliverable is the component layer beneath the page** (`packages/ui`) —
a small, sharp, documented set of primitives the next ten pages would also
reach for. The dashboard app is the proof.

## Run it

```bash
pnpm install
pnpm dev        # web app on :3000 + Storybook catalog on :6006
```

### Demo walkthrough (the live-data story)

The client fetches the fixture once from `GET /api/dashboard`, then **replays
its `history[]` on a compressed timer** (one tick per 3s instead of the real
5 minutes) — the page opens calm and visibly degrades to the current snapshot:
Chat breaches mid-replay and jumps to the top; the final frame shows Billing
"· 55s over", VIP recovering, and three agents out of adherence.

| State | How to demo it |
|---|---|
| Loading | visit `/?delay=4000` — skeletons mirror the final layout |
| Error | click **Simulate error** in the header's Demo controls (or visit `/?fail=1`) — every surface degrades independently with a Retry |
| **Stale** | press **`p`** — replay pauses; ~8s later the page shows "Stale · updated Xs ago", dims, and keeps the data rendered (stale never blanks) |
| Dark mode | press **`d`** or use the header toggle |

## Stack (and why)

- **Turborepo + pnpm workspaces.** The deliverable is a reusable component
  layer, so reuse is *structural*: `@workspace/ui` is a real package consumed
  across a package boundary by two real consumers — the app and Storybook.
- **Next.js App Router, deliberately without SSR of live data.** The shell is
  a static Server Component; the live dashboard is one Client Component. SSR
  of ticking data would fight the exact thing being demonstrated: how
  components handle changing, late, and failed data on the client. Next earns
  its place via the Route Handler — `GET /api/dashboard` serves the fixture
  with `?delay` / `?fail` toggles, turning a local JSON file into a real
  fetch/poll/stale/error surface with no backend.
- **shadcn/ui on Base UI** — component source lives in this repo (we own every
  API), Base UI supplies interaction/a11y behavior, and the visual layer is
  entirely tokens. Primitives are built *on* the stock shadcn parts (Badge,
  Card, Table, Button, Skeleton) rather than from scratch.
- **Tailwind v4 + CSS-variable design tokens (oklch)** — see the token system
  below. **Storybook 10** (react-vite) is the catalog; stories live colocated
  with their components in `packages/ui`.

## The domain model (ubiquitous language)

The same names are the fixture fields, the TypeScript unions, the CSS tokens,
and the component props — nothing drifts between data, tokens, and UI.

| Concept | Values / shape | Lives in |
|---|---|---|
| `Queue` | SLA (`sla_status`, `sla_target_sec`, `longest_wait_sec`, headroom), volume vs. forecast, staffing, `wait_trend_sec[]` | `features/queue-health/model` |
| `Agent` | `state`, `state_since`, adherence (`adherence_status`, `out_of_adherence_sec`), `queues[]` | `features/agent-adherence/model` |
| `Summary` | floor rollup (attainment, breaching/at-risk counts, waiting, adherence counts) | `features/summary/model` |
| `SlaStatus` | `healthy \| at_risk \| breached` | model + tokens + `StatusBadge` prop |
| `AdherenceStatus` | `adherent \| out_of_adherence` | model + tokens + `StatusBadge` prop |
| `AgentState` | `available \| on_call \| on_break \| in_meeting \| offline` | model |
| Freshness | tick arrival vs. now → `live \| stale` | the data hook |

Load-bearing model decisions: pre-computed fields are **trusted** (the server
owns classification; re-deriving would create two sources of truth); wire
format (snake_case) is kept 1:1; severity sort is status rank → depth past
*its own* target → backlog → name — **never raw wait seconds** (Onboarding's
370s is healthy against a 30-minute promise; VIP's 250s is scary against 5).

## The token system

Four tiers in `packages/ui/src/styles/globals.css`, all color in **oklch**:

```
composite / component ──▶ semantic ──▶ primitive
```

- **Primitive** (`--primitive-<hue>-<step>`): cool-cast neutral ramp (adapted
  from Linear's Void→Paper scale) + sparse red/amber/green/indigo ramps.
  Defined in `:root` only, **never in `@theme`** — Tailwind generates no
  utilities for them, so components structurally cannot consume raw values.
- **Semantic**: the shadcn roles plus the domain scale —
  `--status-healthy/-at-risk` and `--adherence-ok/-out` (each with `-foreground`
  and a `-bg` tint), and the reserved **`--sla-breach`** accent. Breach is the
  palette's one loud color: `--status-breached` is a semantic *alias* of
  `--sla-breach`, and `out_of_adherence` (the agent-side schedule breach) takes
  it too, so red can never drift from "a promise is broken." Light/dark remaps
  happen **only** at this tier. All pairs AA-verified numerically (breach is
  red-700 light / red-400 dark, kept distinct from `destructive`, which is an
  action color).
- **Component**: minted only when two consumers need different values for the
  same role. **Zero exist** — a knob nobody overrides is dead weight.
- **Composite**: `shadow-hairline` (Linear's elevation-by-border principle)
  and the metric type ramp `text-metric-lg / text-metric / text-metric-sm` —
  sans + `tabular-nums` (ticking numbers don't jitter; mono reads as code, not
  vitals), weight capped at 500.

## Component APIs — exposed *and deliberately omitted*

Every primitive owns its loading / empty / error / stale rendering internally;
consumers forward one `feed` object (`{ status, lastUpdatedAt?, onRetry? }`,
returned by `useDashboardData()`) and never fetch. The three fields travel
together as one value object rather than a param clump. The essentials:

| Primitive | Exposed | Deliberately omitted (why) |
|---|---|---|
| `StatusBadge` / `StatusDot` | `status` (one five-value union covering SLA + adherence) → canonical **glyph + label** (`StatusDot` renders the standalone status glyph); detail `children` that **augment, never replace** the label | color/variant props (the canonical mapping isn't per-call negotiable); size; onClick |
| `StatCard` | `label`, `value`, `delta` + trend as **ReactNode slots**, and one `feed` object (`{ status, lastUpdatedAt?, onRetry? }`) | card-level color/status (a vital's alarm is its content — tinted cards would compete with the queue table); internal number formatting; navigation |
| `MetricDelta` | raw signed `value`, `unit` → **colorless** arrow glyph + signed number | color (deltas are annotations, not verdicts — verdict color lives on the status surfaces; the palette's red is reserved for breach); an `invert` prop (there is no good/bad to flip when it's colorless); pre-formatted strings |
| `Meter` | normalized `value`/`max`, `label`, optional `status` tint (from the one canonical `statusFillClass`) | magnitude labels (the meter shows *saturation*; the number that says how far over rides beside it in a `MetricDelta`); a fourth severity color |
| `Sparkline` | `points`, optional `status` tint, computed a11y label with override | chart deps, axes, tooltips, animation (snaps on tick) |
| `SparkBars` | `points`, `threshold` (bars past it take the reserved breach accent, others muted), computed a11y label | a configurable tint (the breach accent is not overridable — a red bar always means "over threshold") |
| `DataTable<Row>` | generic column config (`key/header/cell/sortValue/align`), required sr-only `caption`, `rowTone` de-emphasis, optional expandable rows (`getExpandedContent` + `expandLabel`, `aria-controls`-linked), `defaultSort`, one `feed` object | compound/context API (only shared state is one sort tuple); pagination/virtualization (~19 rows total); selection; **row navigation** (rows expand to an inline detail panel, they don't link out) |
| `Duration` | `seconds` → semantic `<time>` | live ticking (compressed replay time would contradict the wall clock — `StaleIndicator` is the only wall-clock surface) |
| `EmptyState` / `ErrorState` / `StaleIndicator` | title/description/action slot; optional `onRetry`; self-ticking `lastUpdatedAt` + `tone` | icons; auto-derived staleness (the hook is the single owner of that logic) |
| `ThemeToggle` | — (no props) | light/dark/system menu (binary flip suffices) |

**Colorless deltas + reserved red.** The palette spends its one loud color,
`--sla-breach`, on exactly one meaning: a broken promise. Queue SLA breach and
an agent out of adherence (an agent-side *schedule* breach) both take it;
`--status-breached` is a semantic alias of `--sla-breach` so it can't drift.
Everything else — deltas, trends, healthy/at-risk — leans on glyphs and calmer
inks, so a red pixel anywhere on the page reads as "a promise is broken."

Also deliberately **not built**: `RelativeTime` (zero consumers — inventory,
not a primitive).

## Product tradeoffs

- **Triage order is the default everywhere**: breaching first, then at-risk,
  healthy last — and the healthy tail **dims** rather than collapses (six
  queues fit on screen; hiding rows a manager still scans costs more than it
  saves). Re-sorting is allowed; severity is a default, not a cage.
- **Volume vs. forecast is a first-class column**: it's the leading indicator
  of the next breach. It reads as a signed delta (over-forecast shows an up
  arrow) rather than in color — red stays reserved for actual breach.
- **Each queue row expands** to a "who can help" coverage panel: the
  out-of-adherence agents skilled on that queue (recoverable capacity) and the
  adherent cross-trained agents who could shift in, so the manager sees the
  lever, not just the problem.
- **Only out-of-adherence agents get rows**; the adherent majority is a
  one-line count. Queue membership in that table is the cause→symptom link
  (Jordan → Billing).
- **Deliberately left out**: drill-downs, historical reporting, scheduling
  actions (the page tells the manager where to look; the levers are human),
  auth, real backend, deploy/CI.

## AI use

Built with Claude (Anthropic), working ticket-by-ticket through a Linear
project where every ticket's resolution records the API decided and the props
deliberately omitted. AI drafted scaffolding, component implementations,
stories, token tables, and column configs. **Verified by hand / against the
running system**: WCAG contrast computed numerically for every status pair in
both themes; the replay narrative, error, and stale paths driven in a real
browser; keyboard semantics (`aria-sort`, real-button sort headers, focus
rings) reviewed per the shadcn/Base UI contracts; `pnpm lint`, `pnpm
typecheck`, `pnpm build`, and the Storybook build gate every change.

The full a11y / keyboard / contrast / responsive verification pass is tracked
and recorded in the project's final ticket.
