import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"

import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { DeviationBar } from "@workspace/ui/components/deviation-bar"
import { Duration } from "@workspace/ui/components/duration"
import { MetricDelta } from "@workspace/ui/components/metric-delta"
import { SparkBars } from "@workspace/ui/components/spark-bars"
import { StatusBadge, type Status } from "@workspace/ui/components/status-badge"
import { formatDurationSec } from "@workspace/ui/lib/duration"

// Domain-agnostic sample rows shaped like the dashboard's queues — defined
// locally; the primitive never imports app types. The COMPOSITION mirrors
// the shipped queue table cell for cell (column order, deviation cells,
// threshold-judged SparkBars), so the flagship story teaches the real
// pattern, not a simplified one that drifts from production.
interface SampleRow {
  id: string
  name: string
  status: Status
  longestWaitSec: number
  targetSec: number
  headroomPct: number
  waiting: number
  onCalls: number
  available: number
  recoverable: number
  actual: number
  forecast: number
  vsForecastPct: number
  trendSec: number[]
}

const ROWS: SampleRow[] = [
  {
    id: "billing",
    name: "Billing",
    status: "breached",
    longestWaitSec: 175,
    targetSec: 120,
    headroomPct: 46,
    waiting: 32,
    onCalls: 3,
    available: 0,
    recoverable: 1,
    actual: 70,
    forecast: 56,
    vsForecastPct: 25,
    trendSec: [48, 55, 70, 88, 105, 118, 132, 150, 168, 175],
  },
  {
    id: "chat",
    name: "Live Chat",
    status: "breached",
    longestWaitSec: 260,
    targetSec: 180,
    headroomPct: 44,
    waiting: 22,
    onCalls: 2,
    available: 0,
    recoverable: 1,
    actual: 80,
    forecast: 64,
    vsForecastPct: 25,
    trendSec: [60, 75, 95, 120, 150, 185, 210, 235, 250, 260],
  },
  {
    id: "vip",
    name: "VIP",
    status: "at_risk",
    longestWaitSec: 250,
    targetSec: 300,
    headroomPct: -17,
    waiting: 9,
    onCalls: 3,
    available: 0,
    recoverable: 1,
    actual: 44,
    forecast: 42,
    vsForecastPct: 5,
    trendSec: [60, 65, 80, 120, 190, 260, 310, 330, 300, 250],
  },
  {
    id: "general",
    name: "General Support",
    status: "healthy",
    longestWaitSec: 190,
    targetSec: 300,
    headroomPct: -37,
    waiting: 10,
    onCalls: 4,
    available: 0,
    recoverable: 0,
    actual: 46,
    forecast: 47,
    vsForecastPct: -2,
    trendSec: [90, 95, 100, 98, 96, 94, 92, 95, 97, 96],
  },
  {
    id: "tier_2",
    name: "Tier 2",
    status: "healthy",
    longestWaitSec: 230,
    targetSec: 600,
    headroomPct: -62,
    waiting: 5,
    onCalls: 4,
    available: 1,
    recoverable: 1,
    actual: 37,
    forecast: 37,
    vsForecastPct: 0,
    trendSec: [180, 190, 200, 210, 230, 250, 260, 255, 240, 230],
  },
  {
    id: "onboarding",
    name: "Onboarding",
    status: "healthy",
    longestWaitSec: 370,
    targetSec: 1800,
    headroomPct: -79,
    waiting: 6,
    onCalls: 3,
    available: 0,
    recoverable: 0,
    actual: 23,
    forecast: 23,
    vsForecastPct: 0,
    trendSec: [300, 320, 340, 360, 370, 365, 370, 372, 370, 370],
  },
]

const SEVERITY: Record<Status, number> = {
  breached: 0,
  at_risk: 1,
  healthy: 2,
  adherent: 2,
  out_of_adherence: 1,
}

// The app's triage key, mirrored: severity band first, then depth past the
// row's own target.
const severityRank = (row: SampleRow) =>
  SEVERITY[row.status] * 10_000 - row.headroomPct

// Story-local mirror of the queue table's deviation-cell anatomy (context
// line over a diverging bar). Like the app's copy, it is table-layout
// composition, not a primitive — it earns promotion to @workspace/ui only
// with a second REAL consumer.
function DeviationCell({
  absolutes,
  delta,
  bar,
}: {
  absolutes: ReactNode
  delta: ReactNode
  bar: ReactNode
}) {
  return (
    <div className="flex w-36 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-metric-sm">{absolutes}</span>
        {delta}
      </div>
      {bar}
    </div>
  )
}

// The shipped column order: demand and capacity (waiting, coverage) before
// the derived pressure metrics (headroom, forecast deviation, trend).
const COLUMNS: DataTableColumn<SampleRow>[] = [
  {
    key: "name",
    header: "Queue",
    cell: (row) => <span className="font-medium">{row.name}</span>,
    sortValue: (row) => row.name,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => {
      const overSec = row.longestWaitSec - row.targetSec
      return (
        <StatusBadge status={row.status}>
          {row.status === "breached" && overSec > 0 && (
            <span>· {formatDurationSec(overSec)} over</span>
          )}
        </StatusBadge>
      )
    },
    sortValue: severityRank,
  },
  {
    key: "waiting",
    header: "Waiting",
    cell: (row) => row.waiting,
    sortValue: (row) => row.waiting,
  },
  {
    key: "coverage",
    header: "Coverage",
    cell: (row) => {
      const levers = [
        row.available > 0 && `${row.available} available`,
        row.recoverable > 0 && `${row.recoverable} recoverable`,
      ].filter(Boolean)
      return (
        <div className="flex flex-col items-start">
          <span>
            {row.onCalls}
            {row.onCalls === 1 ? " on a call" : " on calls"}
          </span>
          {levers.length > 0 && (
            <span className="text-metric-sm text-muted-foreground">
              {levers.join(" · ")}
            </span>
          )}
        </div>
      )
    },
    sortValue: (row) => row.onCalls,
  },
  {
    key: "headroom",
    header: "Headroom",
    cell: (row) => (
      <DeviationCell
        absolutes={
          <>
            <Duration seconds={row.longestWaitSec} /> /{" "}
            <Duration seconds={row.targetSec} />
          </>
        }
        delta={<MetricDelta value={row.headroomPct} />}
        bar={
          <DeviationBar
            value={row.headroomPct}
            label={`${row.name}: longest wait ${formatDurationSec(row.longestWaitSec)} against a ${formatDurationSec(row.targetSec)} target`}
            className="w-full"
          />
        }
      />
    ),
    sortValue: (row) => row.headroomPct,
  },
  {
    key: "forecast",
    header: "Actual / forecast",
    cell: (row) => (
      <DeviationCell
        absolutes={`${row.actual} / ${row.forecast}`}
        delta={<MetricDelta value={row.vsForecastPct} />}
        bar={
          <DeviationBar
            value={row.vsForecastPct}
            range={50}
            label={`${row.name}: ${row.actual} tickets against a forecast of ${row.forecast}`}
            className="w-full"
          />
        }
      />
    ),
    sortValue: (row) => row.vsForecastPct,
  },
  {
    key: "trend",
    header: "Wait trend",
    cell: (row) => (
      <SparkBars
        points={row.trendSec}
        threshold={row.targetSec}
        label={`Longest wait trend for ${row.name}: ${row.trendSec.filter((s) => s > row.targetSec).length} of ${row.trendSec.length} samples over the ${formatDurationSec(row.targetSec)} target`}
      />
    ),
  },
]

const baseArgs = {
  columns: COLUMNS,
  rows: ROWS,
  rowKey: (row: SampleRow) => row.id,
  caption:
    "Sample queues with status, backlog, coverage, SLA headroom, actual volume versus forecast, and wait trend",
  // The fixture's deviation/coverage cells are two-line anatomies — same as
  // the shipped table, so the same rowSize contract applies.
  rowSize: "tall" as const,
}

const meta: Meta<typeof DataTable<SampleRow>> = {
  title: "molecules/data-table",
  component: DataTable,
  parameters: {
    docs: {
      description: {
        component: `
The dense, sortable, keyboard-operable table both dashboard tables are built from — configured entirely by a typed column config (\`key\` / \`header\` / \`cell\` / \`sortValue\` / \`align\`), so it renders any \`Row\` type without knowing the domain. A sr-only \`caption\` is required. A column becomes sortable by having a \`sortValue\`; sort toggles asc/desc and is announced via \`aria-sort\`. Header alignment is not configurable: headers are always left-aligned, and \`align\` governs data cells only. The dashboard's tables pass no \`align\` at all — content shares its header's left edge, so a header always sits over its own data; right-alignment stays available for a consumer whose data genuinely reads better ragged-left.

**The feed contract:** DataTable is a feed OWNER — it owns all four feed states internally. Consumers forward one \`feed\` object (\`{ status: "loading" | "live" | "stale" | "error", lastUpdatedAt?, onRetry? }\`) and never compose state visuals by hand: loading renders skeleton rows under the real header (no layout shift), error renders an \`ErrorState\` with retry, an empty \`rows\` array renders an \`EmptyState\` (\`emptyTitle\` / \`emptyDescription\`), and stale dims the body and shows a \`StaleIndicator\` — it never blanks. The leaf state primitives are the visuals this owner renders, not something to wrap around it. The table never fetches — components below the template never do.

**The no-shift contract has a consumer half:** skeleton and data rows share one row rhythm, but row height is a MINIMUM — content taller than the rhythm grows past the skeletons and loading→live shifts. Pick the \`rowSize\` step that clears your tallest cell: \`"default"\` (40px) for single-line cells, \`"tall"\` (56px) for multi-line anatomies like the deviation cells here. A rhythm that clears the content also makes ragged rows uniform.

**…and a horizontal half:** live cells widen tick to tick — a badge gains a \`· 55s over\` suffix, a lever line appears — and the default auto layout re-solves every column each time, jittering the whole grid sideways. \`layout="fixed"\` sizes columns from the header row alone (give each column a width class via \`column.className\` that clears its widest realistic content; unsized columns split the remainder), so ticking content can never reflow the grid. Both dashboard tables ship with it; \`"auto"\` stays the default for static rows.

**Use it for:** dense read-only rows. \`getExpandedContent\` adds expandable rows — an inline, \`aria-controls\`-linked detail panel per row; return \`null\` for rows with nothing to expand and their toggle is omitted; \`expandLabel\` gives each toggle a row-specific accessible name. The disclosure is deliberately NOT built on shadcn's Collapsible (evaluated, never vendored): a Collapsible's Root/Panel wrappers can't sit between \`<tbody>\` and \`<tr>\` without breaking table semantics, so the expansion keeps native table markup while speaking the same interaction grammar — \`aria-expanded\`/\`aria-controls\`, \`data-state="open|closed"\`, Enter/Space on a real button.

**Not for:** large paginated/virtualized datasets, row selection, or row navigation — rows expand to an inline detail panel, they don't link out.

**Deliberately omitted:** a compound/context API — this is a single component taking columns + rows, because the only shared state is one internal sort tuple and context machinery would give consumers nothing but wiring. No pagination/virtualization (~19 rows total on the dashboard) and no selection. No \`rowTone\`/row-dimming prop — muted ink is reserved for genuine sub-text, never whole rows of data, so the table makes that violation impossible; triage emphasis rides on sort order + a status column (the same make-it-impossible discipline as StatusBadge's missing color props).

These stories' sample fixture mirrors the shipped queue table's composition cell for cell — column order, deviation-cell anatomy, threshold-judged \`SparkBars\` — using only \`@workspace/ui\` primitives and local sample rows, so the catalog teaches the production pattern without importing app code.
`,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {
  args: {
    ...baseArgs,
    defaultSort: { key: "status", direction: "asc" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "The shipped composition: severity sort leads, breached badges carry their over-target magnitude, deviation cells pair absolutes with a colorless delta and bar, and the trend is threshold-judged SparkBars — an over-target bar is the reserved breach accent, per the color law.",
      },
    },
  },
}

export const Loading: Story = {
  args: {
    ...baseArgs,
    rows: [],
    skeletonRows: 6,
    feed: { status: "loading" },
  },
}

export const Empty: Story = {
  args: {
    ...baseArgs,
    rows: [],
    emptyTitle: "No queues to show",
    emptyDescription: "Queues appear as soon as the feed reports them.",
  },
}

export const ErrorWithRetry: Story = {
  args: { ...baseArgs, rows: [], feed: { status: "error", onRetry: () => {} } },
}

export const Stale: Story = {
  args: {
    ...baseArgs,
    feed: { status: "stale", lastUpdatedAt: Date.now() - 42_000 },
  },
}

export const StaleQuiet: Story = {
  args: {
    ...baseArgs,
    feed: { status: "stale", lastUpdatedAt: Date.now() - 42_000 },
    staleNote: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "`staleNote={false}`: the body dim still marks the degradation, but the table's own note is silenced — for pages whose chrome mounts the ONE canonical `StaleIndicator` (both dashboard tables do this).",
      },
    },
  },
}

export const ExpandableRows: Story = {
  args: {
    ...baseArgs,
    defaultSort: { key: "status", direction: "asc" },
    getExpandedContent: (row) =>
      row.recoverable === 0 ? null : (
        <div className="text-sm">
          <span className="font-medium">Jordan P.</span>{" "}
          <span className="text-muted-foreground">
            On break · 15m out of adherence — skilled on {row.name}
          </span>
        </div>
      ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Expandable rows, mirroring the app's who-can-help panel: rows with recoverable capacity carry an inline detail; rows returning null get no toggle. Tab to a chevron, Enter/Space toggles.",
      },
    },
  },
}

// The shipped queue table's width map, mirrored: each width clears its
// column's widest realistic content (the breached badge with its over-target
// suffix sets the w-60), and together they fit the page budget.
const FIXED_WIDTHS: Record<string, string> = {
  name: "w-32",
  status: "w-60",
  waiting: "w-24",
  coverage: "w-44",
  headroom: "w-40",
  forecast: "w-40",
  trend: "w-24",
}

export const FixedLayout: Story = {
  args: {
    ...baseArgs,
    columns: COLUMNS.map((c) => ({ ...c, className: FIXED_WIDTHS[c.key] })),
    layout: "fixed",
    defaultSort: { key: "status", direction: "asc" },
  },
  parameters: {
    docs: {
      description: {
        story:
          '`layout="fixed"` with a width class per column — the horizontal no-shift contract. Sort by Status and watch the breached badges\' over-target suffixes come and go from the top rows: the columns hold. Under the default auto layout, every content change re-solves the grid.',
      },
    },
  },
}

// The one interactive story: every other state story couples its data to the
// state (Loading/Empty/Error pass rows: []); this one holds FILLED rows
// constant so flipping the control swaps only the state and any resolve-time
// layout shift becomes visible.
const PLAYGROUND_STATES = [
  "loading",
  "live",
  "stale",
  "error",
  "empty",
] as const

export const States: StoryObj<{ state: (typeof PLAYGROUND_STATES)[number] }> = {
  name: "States (playground)",
  argTypes: {
    state: { control: "select", options: [...PLAYGROUND_STATES] },
  },
  args: { state: "loading" },
  parameters: {
    docs: {
      description: {
        story:
          "Playground: flip `state` to watch the transitions in place — the sidebar state stories re-mount on every click, so only this control shows the reflow. The contract under test is **loading → live: no layout shift** — the real header stays and skeleton rows must match resolved row height (pass `skeletonRows` = your typical row count, as the dashboard does). Empty swapping to the centered message block is a designed difference, not a shift bug.",
      },
    },
  },
  render: ({ state }) => (
    // Fixed-width wrapper: the app's tables are container-constrained
    // (sections span the page), so width never shifts there — an unwrapped
    // canvas table would shrink-wrap per state and fake a width bug. Wide
    // enough for the resolved cells (~970px), or the overflow container
    // grows a horizontal scrollbar in the live state only and fakes a
    // ~15px HEIGHT bug too.
    <div className="w-5xl">
      <DataTable
        {...baseArgs}
        rows={state === "empty" ? [] : ROWS}
        skeletonRows={ROWS.length}
        defaultSort={{ key: "status", direction: "asc" }}
        emptyTitle="No queues to show"
        emptyDescription="Queues appear as soon as the feed reports them."
        feed={
          state === "loading"
            ? { status: "loading" }
            : state === "error"
              ? { status: "error", onRetry: () => {} }
              : state === "stale"
                ? { status: "stale", lastUpdatedAt: Date.now() - 42_000 }
                : { status: "live" }
        }
      />
    </div>
  ),
}

export const Dense: Story = {
  args: {
    ...baseArgs,
    rows: Array.from({ length: 3 }, (_, i) =>
      ROWS.map((row) => ({
        ...row,
        id: `${row.id}-${i}`,
        waiting: row.waiting + i,
      }))
    ).flat(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "18 rows: keyboard-sort the columns (Tab to a header, Enter/Space toggles).",
      },
    },
  },
}
