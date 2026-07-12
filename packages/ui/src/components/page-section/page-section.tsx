import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// The page's section shell: a labelled <section> with the canonical heading
// block (h2 + muted description) above whatever the section holds. Extracted
// because every dashboard section repeats this exact anatomy — one component
// keeps the heading hierarchy and the aria-labelledby wiring from drifting.
//
// Deliberately fixed: the heading level (h2 — sections sit under the page's
// single h1) and the heading type ramp. No margins baked in: the call site's
// stack owns spacing between sections. No actions slot until a second
// consumer earns it.

interface PageSectionProps {
  /** Stable slug; the heading gets `${id}-heading` and the section points at it. */
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function PageSection({
  id,
  title,
  description,
  children,
  className,
}: PageSectionProps) {
  const headingId = `${id}-heading`
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-base font-semibold">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export { PageSection }
