// The condition of a live data feed, plus how to react to it. These three
// fields travel together to every data-bearing surface (StatCard, DataTable,
// the dashboard sections), so they ride as one value object rather than a
// three-parameter clump: `status` drives which state a surface renders,
// `lastUpdatedAt` feeds the stale indicator, `onRetry` recovers from error.

export type FeedStatus = "loading" | "live" | "stale" | "error"

export interface Feed {
  status: FeedStatus
  /** Wall-clock ms of the last tick; feeds the stale indicator when stale. */
  lastUpdatedAt?: number | null
  /** Recovers from the error state. */
  onRetry?: () => void
}
