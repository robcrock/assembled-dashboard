import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// The page's section shell: a labelled <section> with the canonical heading
// block (h2 + muted description) above whatever the section holds. Extracted
// because every dashboard section repeats this exact anatomy — one component
// keeps the heading hierarchy and the aria-labelledby wiring from drifting.
//
// Deliberately fixed: the heading level (h2 — sections sit under the page's
// single h1) and the heading type ramp. No margins baked in: the call site's
// stack owns spacing between sections.
//
// The `actions` slot is earned, not speculative: a section-scoped control
// (the dashboard's Edit toggle) has to live where the eye already looks for
// what a section can do — beside its heading — rather than floating above
// the content it acts on. A slot, not an `onEdit` prop: the section shell
// has no opinion about what the action IS, and the moment it did, every new
// action would mean a new prop.

interface PageSectionProps {
  /** Stable slug; the heading gets `${id}-heading` and the section points at it. */
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  /** Section-scoped controls, aligned to the heading's top edge. Absent ⇒ the heading block spans the row. */
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function PageSection({
  id,
  title,
  description,
  actions,
  children,
  className,
}: PageSectionProps) {
  const headingId = `${id}-heading`
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      {/* items-start, not center: the description makes the heading block
          two lines tall, and a centered action would drift off the title
          it belongs to. gap-4 keeps a long description clear of the slot. */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export { PageSection }
