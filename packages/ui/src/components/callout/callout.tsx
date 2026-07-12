import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// A quiet contextual aside: hairline rule + muted small text. Chrome for
// caveats and shared context that sits BESIDE data — never for alarms. A
// callout that wants a verdict color is a status surface wearing the wrong
// clothes; verdicts belong to StatusBadge/ErrorState and the status scale.

interface CalloutProps {
  children: React.ReactNode
  className?: string
}

function Callout({ children, className }: CalloutProps) {
  return (
    <aside
      className={cn(
        "border-border text-muted-foreground border-l-2 pl-3 text-xs",
        className,
      )}
    >
      {children}
    </aside>
  )
}

export { Callout }
