import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-table"
import { Sparkline } from "@workspace/ui/components/sparkline"
import {
  StatusBadge,
  type Status,
} from "@workspace/ui/components/status-badge"

// Domain-agnostic sample rows shaped like the dashboard's queues — defined
// locally; the primitive never imports app types.
interface SampleRow {
  id: string
  name: string
  status: Status
  waiting: number
  overForecastPct: number
  trend: number[]
}

const ROWS: SampleRow[] = [
  { id: "billing", name: "Billing", status: "breached", waiting: 32, overForecastPct: 25, trend: [48, 55, 70, 88, 105, 118, 132, 150, 168, 175] },
  { id: "chat", name: "Live Chat", status: "breached", waiting: 18, overForecastPct: 25, trend: [40, 48, 60, 75, 95, 110, 128, 150, 165, 172] },
  { id: "vip", name: "VIP", status: "at_risk", waiting: 9, overForecastPct: 5, trend: [60, 65, 80, 120, 190, 260, 310, 330, 300, 250] },
  { id: "tier_2", name: "Tier 2", status: "healthy", waiting: 5, overForecastPct: 0, trend: [180, 190, 200, 210, 230, 250, 260, 255, 240, 230] },
  { id: "onboarding", name: "Onboarding", status: "healthy", waiting: 12, overForecastPct: -10, trend: [300, 320, 340, 360, 370, 365, 370, 372, 370, 370] },
  { id: "general", name: "General", status: "healthy", waiting: 8, overForecastPct: -5, trend: [90, 95, 100, 98, 96, 94, 92, 95, 97, 96] },
]

const SEVERITY: Record<Status, number> = {
  breached: 0,
  at_risk: 1,
  healthy: 2,
  adherent: 2,
  out_of_adherence: 1,
}

const COLUMNS: DataTableColumn<SampleRow>[] = [
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.status} />,
    sortValue: (row) => SEVERITY[row.status],
  },
  {
    key: "name",
    header: "Queue",
    cell: (row) => <span className="text-foreground font-medium">{row.name}</span>,
    sortValue: (row) => row.name,
  },
  {
    key: "waiting",
    header: "Waiting",
    cell: (row) => row.waiting,
    sortValue: (row) => row.waiting,
    align: "right",
  },
  {
    key: "forecast",
    header: "Vs forecast",
    cell: (row) => `${row.overForecastPct > 0 ? "+" : ""}${row.overForecastPct}%`,
    sortValue: (row) => row.overForecastPct,
    align: "right",
  },
  {
    key: "trend",
    header: "Wait trend",
    cell: (row) => (
      <Sparkline
        points={row.trend}
        status={row.status === "healthy" ? undefined : row.status}
      />
    ),
    align: "right",
  },
]

const baseArgs = {
  columns: COLUMNS,
  rows: ROWS,
  rowKey: (row: SampleRow) => row.id,
  caption: "Sample queues with status, backlog, forecast and wait trend",
}

const meta: Meta<typeof DataTable<SampleRow>> = {
  title: "molecules/data-table",
  component: DataTable,
  parameters: {
    docs: {
      description: {
        component: `
The dense, sortable, keyboard-operable table both dashboard tables are built from — configured entirely by a typed column config (\`key\` / \`header\` / \`cell\` / \`sortValue\` / \`align\`), so it renders any \`Row\` type without knowing the domain. A sr-only \`caption\` is required. A column becomes sortable by having a \`sortValue\`; sort toggles asc/desc and is announced via \`aria-sort\`.

**The feed contract:** DataTable is a feed OWNER — it owns all four feed states internally. Consumers forward one \`feed\` object (\`{ status: "loading" | "live" | "stale" | "error", lastUpdatedAt?, onRetry? }\`) and never compose state visuals by hand: loading renders skeleton rows under the real header (no layout shift), error renders an \`ErrorState\` with retry, an empty \`rows\` array renders an \`EmptyState\` (\`emptyTitle\` / \`emptyDescription\`), and stale dims the body and shows a \`StaleIndicator\` — it never blanks. The leaf state primitives are the visuals this owner renders, not something to wrap around it. The table never fetches — components below the template never do.

**Use it for:** dense read-only rows. \`rowTone\` de-emphasizes rows without the table knowing why (severity-sorted consumers mute their healthy tail). \`getExpandedContent\` adds expandable rows — an inline, \`aria-controls\`-linked detail panel per row; return \`null\` for rows with nothing to expand and their toggle is omitted; \`expandLabel\` gives each toggle a row-specific accessible name.

**Not for:** large paginated/virtualized datasets, row selection, or row navigation — rows expand to an inline detail panel, they don't link out.

**Deliberately omitted:** a compound/context API — this is a single component taking columns + rows, because the only shared state is one internal sort tuple and context machinery would give consumers nothing but wiring. Also no pagination/virtualization (~19 rows total on the dashboard) and no selection.
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
}

export const TriageEmphasis: Story = {
  args: {
    ...baseArgs,
    defaultSort: { key: "status", direction: "asc" },
    rowTone: (row) => (row.status === "healthy" ? "muted" : "default"),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Healthy tail de-emphasized via rowTone — the table never learns what "healthy" means.',
      },
    },
  },
}

export const Loading: Story = {
  args: { ...baseArgs, rows: [], feed: { status: "loading" } },
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

export const ExpandableRows: Story = {
  args: {
    ...baseArgs,
    defaultSort: { key: "status", direction: "asc" },
    getExpandedContent: (row) =>
      row.status === "healthy" ? null : (
        <div className="text-sm">
          <span className="font-medium">{row.name}</span>{" "}
          <span className="text-muted-foreground">
            — {row.waiting} waiting, {row.overForecastPct}% vs forecast
          </span>
        </div>
      ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Expandable rows: troubled rows carry an inline detail panel; healthy rows return null and get no toggle. Tab to a chevron, Enter/Space toggles.",
      },
    },
  },
}

// The one interactive story: every other state story couples its data to the
// state (Loading/Empty/Error pass rows: []); this one holds FILLED rows
// constant so flipping the control swaps only the state and any resolve-time
// layout shift becomes visible.
const PLAYGROUND_STATES = ["loading", "live", "stale", "error", "empty"] as const

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
    // canvas table would shrink-wrap per state and fake a width bug.
    <div className="w-2xl">
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
      ROWS.map((row) => ({ ...row, id: `${row.id}-${i}`, waiting: row.waiting + i })),
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
