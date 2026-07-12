// Canonical signed-delta formatting — MetricDelta renders it.
//
// A delta's direction is carried entirely by its explicit +/− sign; it is
// never judged as good or bad (verdict color is reserved for the status
// surfaces).

/**
 * Explicit sign so over/under never needs re-reading: "+25%", "-17%", "0%",
 * "+8" (no unit). One formatter for every delta on the page.
 */
export function formatSigned(value: number, unit = ""): string {
  return `${value > 0 ? "+" : ""}${value}${unit}`
}
