import { formatDurationSec } from "@workspace/ui/lib/duration"
import { cn } from "@workspace/ui/lib/utils"

// Renders a duration from data — it does NOT live-tick. Under replay, data
// time is compressed (5 fixture-minutes per 3s tick), so a wall-clock ticker
// would disagree with every other number on screen; durations update when the
// data does. The only wall-clock surface is StaleIndicator. Semantic <time>
// with an ISO-8601 duration; tabular figures so columns of these don't jitter.

interface DurationProps {
  seconds: number
  className?: string
}

function Duration({ seconds, className }: DurationProps) {
  const safe = Math.max(0, Math.floor(seconds))
  return (
    <time dateTime={`PT${safe}S`} className={cn("tabular-nums", className)}>
      {formatDurationSec(safe)}
    </time>
  )
}

export { Duration }
