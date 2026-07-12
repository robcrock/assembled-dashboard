import { Fragment, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

// Docs-only helpers for the icons MDX page — NOT part of the library surface
// (the exports map doesn't expose ./docs/*, and the stories glob only matches
// *.stories.tsx, so this can never leak into app code or the sidebar). The
// glyph is LIVE: it renders the real lucide component at the real size class
// transcribed from its consumer, so the visual can never drift from lucide —
// only the hand-authored meta strings can.

interface IconSpecimenProps {
  /** The lucide component under documentation. */
  icon: LucideIcon
  /** The lucide export name, printed in the meta. */
  name: string
  /** The size class the consumer actually applies (e.g. `size-3.5`). */
  size: string
  /** The real consumer of this glyph. */
  usedBy: string
  /** What the glyph means where it's used. */
  meaning: string
  /** One-line caveat rendered under the meta. */
  note?: string
}

/** One glyph: live sample (left, at its consumer's real size) + meta grid (right). */
export function IconSpecimen({
  icon: Icon,
  name,
  size,
  usedBy,
  meaning,
  note,
}: IconSpecimenProps) {
  const fields: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "glyph", value: name, mono: true },
    { label: "size", value: size, mono: true },
    { label: "used by", value: usedBy },
    { label: "meaning", value: meaning },
  ]

  return (
    <div className="sb-unstyled grid gap-4 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:items-center sm:gap-10">
      <div className="text-foreground flex h-10 w-14 items-center justify-center">
        <Icon aria-hidden className={cn("shrink-0", size)} />
      </div>
      {/* plain divs, not dl/dt/dd — the Storybook docs stylesheet targets
          bare definition-list elements and would override the system voices */}
      <div className="font-sans">
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5">
          {fields.map(({ label, value, mono }) => (
            <Fragment key={label}>
              <div className="text-label text-muted-foreground">{label}</div>
              <div
                className={cn("text-foreground text-xs", mono && "font-mono")}
              >
                {value}
              </div>
            </Fragment>
          ))}
        </div>
        {note && (
          <div className="text-muted-foreground mt-2 text-xs">{note}</div>
        )}
      </div>
    </div>
  )
}

/**
 * Stacks `IconSpecimen` rows with hairline dividers. `sb-unstyled` opts out
 * of the Storybook docs theme; the panel paints the system's own
 * bg-background so glyph ink is the token layer's, not the docs chrome's —
 * same construction as the typography page's TypeRamp.
 */
export function IconGrid({ children }: { children: ReactNode }) {
  return (
    <div className="sb-unstyled bg-background divide-border divide-y rounded-sm border px-5">
      {children}
    </div>
  )
}
