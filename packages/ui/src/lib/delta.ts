// Canonical signed-delta semantics — MetricDelta renders it.
//
// A delta has a magnitude and a semantic direction; whether "up" is good or
// bad belongs to the consumer (MetricDelta's `invert`), never to the value.

export type DeltaDirection = "up" | "down" | "flat"

export function deltaDirection(value: number): DeltaDirection {
  if (value > 0) return "up"
  if (value < 0) return "down"
  return "flat"
}

/**
 * Explicit sign so over/under never needs re-reading: "+25%", "-17%", "0%",
 * "+8" (no unit). One formatter for every delta on the page.
 */
export function formatSigned(value: number, unit = ""): string {
  return `${value > 0 ? "+" : ""}${value}${unit}`
}
