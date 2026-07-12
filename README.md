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
pnpm --filter storybook dev   # catalog only
```

No local setup at all: the catalog is deployed at
**<https://assembled-dashboard-storybook.vercel.app>** — every primitive across
every state and variant, plus the `system/` docs pages.

### Demo walkthrough (the live-data story)

The client fetches the fixture once from `GET /api/dashboard`, then **replays
its `history[]` on a compressed timer** (one tick per 3s instead of the real
5 minutes) — the page opens calm and visibly degrades to the current snapshot:
Chat breaches mid-replay and jumps to the top; the final frame shows Billing
"· 55s over", VIP recovering, and three agents out of adherence.

| State | How to demo it |
|---|---|
| Loading | visit `/?delay=4000` — skeletons mirror the final layout |
| Error | click **Inject error** in the overview band's Demo controls (or visit `/?fail=1`) — every surface degrades independently with a Retry |
| **Stale** | press **`p`** — replay pauses; ~8s later the page shows "Stale · updated Xs ago", dims, and keeps the data rendered (stale never blanks). No lever needed at the end: once the ~30s replay exhausts the fixture, the feed decays to stale on its own — an exhausted feed ages honestly rather than heartbeating "live". Reload restarts the replay |
| Dark mode | the dashboard defaults to light; press `d` to flip themes — it mounts no toggle, and the `ThemeToggle` primitive lives in the Storybook catalog |

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
  below. **Storybook 10** (react-vite) is the catalog *and the system's
  documentation home*: stories live colocated with their components in
  `packages/ui`, every component gets an autodocs page (JSDoc props table +
  when-to-use/deliberately-omitted notes), and the system's rules are MDX
  pages under the sidebar's `system/` group — introduction, tokens,
  color-law, feed-states, a choosing-a-data-primitive decision table, and
  the brand layer.

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

- **Primitive** (`--primitive-<hue>-<step>`): the Braun "concrete" neutral
  ramp — warm cream at the light end, cool graphite at the dark end, anchored
  on the four `DESIGN.md` literals (#F3F1EC / #E7E5E1 / #6B6F74 / #0F1113),
  mid-steps interpolated in OKLab — plus the utility-orange ramp (#D95600)
  and a sparse amber ramp. Defined in `:root` only, **never in `@theme`** —
  Tailwind generates no utilities for them, so components structurally cannot
  consume raw values.
- **Semantic**: the shadcn roles plus the domain scale —
  `--status-healthy/-at-risk` and `--adherence-ok/-out` (each with `-foreground`
  and a `-bg` tint), and the reserved **`--sla-breach`** accent. Breach is the
  palette's one loud color — the Braun utility orange: `--status-breached` is a
  semantic *alias* of `--sla-breach`, and `out_of_adherence` (the agent-side
  schedule breach) takes it too, so orange can never drift from "a promise is
  broken." `destructive` aliases breach outright (a failed action IS a broken
  promise), and the urgency ramp is **grey → amber → orange**: healthy demotes
  to concrete grey, at-risk keeps amber — the one documented deviation from the
  spec's single-accent rule, paid for triage scanning. Light/dark remaps happen
  **only** at this tier (the dark theme is an authored Braun inversion; the
  spec ships none). All pairs AA-verified numerically in both themes — where a
  spec literal fails 4.5:1 as text on its own surfaces (#6B6F74, #D95600), the
  ink uses a solved ramp step and the literal stays for fills/large type.
- **Component**: minted only when two consumers need different values for the
  same role. **Zero exist** — a knob nobody overrides is dead weight.
- **Composite**: `shadow-hairline` (elevation-by-border — Braun-flat, no
  shadows), the metric type ramp `text-metric-lg / text-metric /
  text-metric-sm` — sans + `tabular-nums` (ticking numbers don't jitter; mono
  digits read as code, not vitals), weight capped at 500 — and the
  `text-label` tier (JetBrains Mono, 0.72rem, +0.08em: labels and table
  headers speak in the spec's mono label voice).

## The atomic mapping

Atomic design is the system's organizing language, expressed in place — Storybook
titles carry the tier, folders and import paths stay flat:

| Tier | Lives at | Contents |
|---|---|---|
| **Ions** (tokens) | `packages/ui/src/styles/globals.css` | the 4-tier token architecture above |
| **Atoms** | `packages/ui` | leaves that compose no other component (badge, skeleton, duration, metric-delta, sparkline, spark-bars, meter, deviation-bar, gauge, callout, …) |
| **Molecules** | `packages/ui` | compose atoms / own multi-part anatomy + feed states (status-badge, stat-card, data-table, empty/error/stale states, page-section, org-identity) |
| **Organisms** | `apps/web/features/*` | domain-bound compositions (attainment-overview, queue-health-table, agent-adherence-table) |
| **Template** | `apps/web/app/dashboard.tsx` | the one client boundary: owns the data hook + page UI state, arranges organisms |
| **Page / Layout** | `apps/web/app/page.tsx` / `layout.tsx` | route → template; document shell |

## Component APIs — exposed *and deliberately omitted*

Every primitive owns its loading / empty / error / stale rendering internally;
consumers forward one `feed` object (`{ status, lastUpdatedAt?, onRetry? }`,
returned by `useDashboardData()`) and never fetch. The three fields travel
together as one value object rather than a param clump. State ownership runs
down a ladder: the store owns fetch/replay/staleness → the template owns page
UI state (pause, injected error) → organisms own per-slice derivation (sort,
tick history) → molecules/atoms are stateless or self-contained.

The seven vendored shadcn atoms (badge, button, card, table, tooltip,
separator, skeleton) keep their stock APIs — as-shipped fidelity keeps upstream
upgrades cheap — and their notes live on their Storybook autodocs pages. The
table below covers the system's own primitives:

| Primitive | Exposed | Deliberately omitted (why) |
|---|---|---|
| `StatusBadge` / `StatusDot` | `status` (one five-value union covering SLA + adherence) → canonical **glyph + label** (`StatusDot` renders the standalone status glyph); detail `children` that **augment, never replace** the label | color/variant props (the canonical mapping isn't per-call negotiable); size; onClick |
| `StatCard` | `label`, `value`, `delta` + trend as **ReactNode slots**, one `feed` object, `variant: card \| plain` (card chrome vs divider rows), `size: default \| lg` (dense-strip ramp vs overview hero counts — type scale only) | card-level color/status (a vital's alarm is its content — the overview passes a breach-inked value node; tinted cards would compete with the queue table); internal number formatting; navigation |
| `MetricDelta` | raw signed `value`, `unit` → **colorless** signed number (the explicit +/− sign carries direction) | color (deltas are annotations, not verdicts — verdict color lives on the status surfaces; the palette's orange is reserved for breach); direction arrows/glyphs (the sign already says it); an `invert` prop (there is no good/bad to flip when it's colorless); pre-formatted strings |
| `Meter` | normalized `value`/`max`, `label`, optional `status` tint (from the one canonical `statusFillClass`) | magnitude labels (the meter shows *saturation*; the number that says how far over rides beside it in a `MetricDelta`); a fourth severity color |
| `DeviationBar` | signed `value` (± % around a center baseline dot), `label`, `range` clamp per half | color entirely — one neutral muted fill (verdict color lives on the badges beside it); a direction/`invert` prop (the sign IS the direction — over extends right past the dot, under extends left); a rendered number (the exact figure rides beside it); threshold markers |
| `Sparkline` | `points`, optional `status` tint, computed a11y label with override | chart deps, axes, tooltips, animation (snaps on tick). Catalog-only: the shipped queue table renders `SparkBars`; kept awaiting a line-trend consumer |
| `Gauge` | normalized `value` (0–100), `label`, center content via **children** (the gauge owns only the arc — it never formats numbers) | gradient / threshold zones / needle (tokens only: muted track, `currentColor` arc); animation; internal number formatting. Catalog-only: the overview replaced the arc with the attainment tile's `Meter` line; kept awaiting a hero-reading consumer |
| `SparkBars` | `points`, `threshold` (bars past it take the reserved breach accent, others muted), computed a11y label | a configurable tint (the breach accent is not overridable — an orange bar always means "over threshold") |
| `DataTable<Row>` | generic column config (`key/header/cell/sortValue/align`), required sr-only `caption`, optional expandable rows (`getExpandedContent` + `expandLabel`, `aria-controls`-linked), `defaultSort`, `rowSize: default \| tall` (skeleton AND data rows share the chosen rhythm — pick the step that clears your tallest cell, and loading resolves with zero shift), `layout: auto \| fixed` (fixed sizes columns from the header row's width classes so ticking cell content never reflows the grid — both dashboard tables use it), one `feed` object | compound/context API (only shared state is one sort tuple); pagination/virtualization (~19 rows total); selection; **row navigation** (rows expand to an inline detail panel, they don't link out); a `rowTone`/row-dimming prop (muted ink is sub-text only — the table makes whole-row muting impossible; triage emphasis rides on sort + a status column) |
| `Duration` | `seconds` → semantic `<time>` | live ticking (compressed replay time would contradict the wall clock — `StaleIndicator` is the only wall-clock surface) |
| `Callout` | children + `className` — a quiet aside (hairline rule, muted small text) for context beside data | status/variant tints (a tinted callout is a verdict, and verdicts belong to status surfaces); icon slot; title prop; dismissal |
| `EmptyState` / `ErrorState` / `StaleIndicator` | title/description/action slot; optional `onRetry`; self-ticking `lastUpdatedAt` + `tone` | icons; auto-derived staleness (the hook is the single owner of that logic) |
| `ThemeToggle` | — (no props) | light/dark/system menu (binary flip suffices). Catalog-only: the dashboard defaults to light and mounts no toggle |
| `PageSection` | `id` (heading gets `${id}-heading`, `aria-labelledby` wired), `title`, `description`, children | heading-level prop (h2 is the page anatomy under the single h1); actions slot (unearned); baked-in margins (the call site's stack owns spacing); collapse |
| `OrgIdentity` | `name` (null → layout-mirroring skeletons), `tagline`, `href` (default "/", `aria-label="Homepage"`) | logo upload (monogram derives from the name — identity is data in a whitelabel system); a size prop (single consumer scale); heading-level choice (the identity block anchors a page, so the name IS the h1) |

**Colorless deltas + reserved orange.** The palette spends its one loud color,
`--sla-breach` — the Braun utility orange — on exactly one meaning: a broken
promise. Queue SLA breach and an agent out of adherence (an agent-side
*schedule* breach) both take it; `--status-breached` is a semantic alias of
`--sla-breach` so it can't drift. Everything else — deltas, trends,
healthy/at-risk — leans on glyphs and calmer inks (grey → amber → orange), so
an orange pixel anywhere on the page reads as "a promise is broken." The
`MetricDelta` primitive is colorless everywhere, with **no exceptions**: even
the queue table's headroom percent stays neutral, because the SLA verdict
already lives in that row's Status badge — a second colored number would just
compete with it. The status colors ride on the dedicated status surfaces
(badges, the `Sparkline` tint), never on the deltas.

Also deliberately **not built**: `RelativeTime` (zero consumers — inventory,
not a primitive).

## Product tradeoffs

- **The overview is three numbers, not a KPI strip**: an SLA-attainment
  tile — hero number over a 0–100 `Meter` fill line (the org-level promise,
  a reading in neutral ink, not a verdict) — plus the two alarm counts —
  queues breaching, agents out of adherence — each previewing the section
  that explains it. All three are `StatCard size="lg"` siblings with one
  rhythm. Everything else lives beside the data that gives it meaning.
- **Triage order is the default everywhere**: breaching first, then at-risk,
  healthy last — and the healthy tail keeps **full ink** (muted text is
  reserved for genuine sub-text, never whole rows a manager still reads);
  de-emphasis rides on the sort order and the grey Healthy badge alone.
  Re-sorting is allowed; severity is a default, not a cage.
- **Volume vs. forecast is a first-class column**: it's the leading indicator
  of the next breach. The volume column (headed "Actual / forecast") consolidates
  the whole story — actual /
  forecast absolutes with a diverging `DeviationBar` against the forecast
  baseline — but deliberately **without color** (neutral fill, colorless
  delta): over-forecast is an indicator, not a verdict, so orange stays
  reserved for actual breach. Both deviation cells (headroom and volume) are fully
  neutral — bar and percent alike; the SLA verdict lives in the Status badge.
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
rings) reviewed per the shadcn/Base UI contracts; `pnpm lint` (zero warnings,
enforced by `--max-warnings 0`), `pnpm typecheck`, `pnpm build`, and the
Storybook build gate every change.

### The verification pass (recorded)

The final a11y + responsive pass, run against the real catalog and dashboard:

- **axe sweep** (axe-core 4.10.2, all 105 stories in light + 16 status-heavy
  stories in dark): 102/105 fully clean with **zero structural violations
  anywhere** — no ARIA, role, label, or name findings in the catalog. The one
  rule that fired is color-contrast, in 3 stories, each a documented call: the
  stock destructive Badge/Button tints (4.09:1 — unshipped stock variants,
  brand deviations register #6) and the DataTable stale story (`stale-dim`
  deliberately trades contrast for honesty on degraded data — the feed-states
  page records why; live data is always AA).
- **Keyboard**: every interactive element is a native button or link
  (Enter/Space semantics come from the platform); `aria-sort` updates live on
  both tables; expand toggles pair `aria-expanded`/`aria-controls` with
  row-specific labels; both tables carry sr-only captions; all interactive
  elements share the single `focus-ring` treatment (the pass caught the
  OrgIdentity link outside it — fixed).
- **Contrast, rendered, both themes** (canvas readback of computed colors):
  every status/text pair ≥ 4.5:1 — light worst case 4.69 (breach ink on the
  page), dark worst case 4.70 (breached badge ink on its tint).
- **Responsive**: at 375px the page has zero body-level overflow — tables
  scroll inside their own containers, the KPI band stacks to a 2-column grid,
  and the expanded coverage panel wraps clean; at 768px the queue table
  scrolls internally and the agents table fits; the second-monitor width is
  the design target.
