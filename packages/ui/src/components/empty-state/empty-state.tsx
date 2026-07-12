import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// A deliberate empty, never a blank div. Consumers (StatCard, DataTable)
// render this internally for their empty state; it also stands alone.

interface EmptyStateProps {
  title: string
  description?: string
  /** Action slot (e.g. a Button) — a slot, not an onAction prop, per children-over-renderX. */
  action?: React.ReactNode
  className?: string
}

function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-6 py-10 text-center",
        className
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export { EmptyState }
