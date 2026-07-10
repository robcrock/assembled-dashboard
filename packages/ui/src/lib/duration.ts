// Canonical duration formatting: seconds → human. Lives in the ui package
// because primitives (StaleIndicator, Duration) tick it — one implementation
// shared by the library and the app.

/**
 * Compact human duration for dense UI: "45s", "1m 30s", "25m", "1h 5m".
 * Seconds are dropped once minutes reach double digits; minutes are dropped
 * at zero. Negative input clamps to "0s".
 */
export function formatDurationSec(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  if (sec < 60) return `${sec}s`

  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60

  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return s > 0 && m < 10 ? `${m}m ${s}s` : `${m}m`
}
