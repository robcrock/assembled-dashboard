import { NextResponse } from "next/server"

import dashboardState from "@/lib/fixtures/dashboard_state.json"

// GET /api/dashboard — the local stand-in for a live metrics API.
//
// This is polled from the client (see hooks/use-dashboard-data.ts); it is never
// statically cached and the app never SSR's this data. Returning the whole
// fixture ({ generated_at, meta, current, history }) lets the client render
// `current` and replay `history[]` on a timer to simulate live updates.
//
// Two query params turn a static fixture into a real fetch surface, so the
// components' loading / stale / error states are demonstrable, not theoretical:
//   ?delay=<ms>        inject latency (capped at 10s)
//   ?fail=1|<status>   respond with an error (defaults to 500)
export const dynamic = "force-dynamic"

const MAX_DELAY_MS = 10_000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const delayMs = Math.min(
    Math.max(Number(searchParams.get("delay")) || 0, 0),
    MAX_DELAY_MS
  )
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  const fail = searchParams.get("fail")
  if (fail) {
    const status = Number(fail) >= 400 ? Number(fail) : 500
    return NextResponse.json(
      { error: "Simulated upstream failure" },
      { status }
    )
  }

  return NextResponse.json(dashboardState)
}
