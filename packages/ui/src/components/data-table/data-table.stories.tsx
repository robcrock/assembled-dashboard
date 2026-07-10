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
  title: "primitives/data-table",
  component: DataTable,
}

export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {
  args: {
    ...baseArgs,
    defaultSort: { key: "status", direction: "asc" },
  },
}

// Healthy tail de-emphasized via rowTone — the table never learns what "healthy" means.
export const TriageEmphasis: Story = {
  args: {
    ...baseArgs,
    defaultSort: { key: "status", direction: "asc" },
    rowTone: (row) => (row.status === "healthy" ? "muted" : "default"),
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

// 18 rows: keyboard-sort the columns (Tab to a header, Enter/Space toggles).
export const Dense: Story = {
  args: {
    ...baseArgs,
    rows: Array.from({ length: 3 }, (_, i) =>
      ROWS.map((row) => ({ ...row, id: `${row.id}-${i}`, waiting: row.waiting + i })),
    ).flat(),
  },
}
