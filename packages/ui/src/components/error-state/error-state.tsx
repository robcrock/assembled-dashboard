import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

// Failed-load surface with the retry affordance. role="alert" so assistive
// tech announces the failure when it appears.

interface ErrorStateProps {
  /** Defaults to a generic headline; pass the upstream message via description. */
  title?: string
  description?: string
  /** Optional — omit when the consumer has no meaningful retry. */
  onRetry?: () => void
  className?: string
}

function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border-status-breached-bg flex flex-col items-center justify-center gap-1 rounded-lg border px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-status-breached text-sm font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  )
}

export { ErrorState }
