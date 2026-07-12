import { Fragment, type ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

// Docs-only helpers for the typography MDX page — NOT part of the
// library surface (the exports map doesn't expose ./docs/*, and the stories
// glob only matches *.stories.tsx, so this can never leak into app code or
// the sidebar). The sample is LIVE: it renders with the real utility class,
// so the visual can never drift from globals.css — only the hand-authored
// meta strings can. Faces are set explicitly (font-sans / the utility's own
// font-family) because the Storybook docs wrapper applies its own theme font.

/**
 * Stacks `TypeSpecimen` rows with hairline dividers. `sb-unstyled` is
 * Storybook's own opt-out: without it the docs wrapper forces its theme
 * font-family/size onto every div, silently overriding the very utilities
 * this page exists to show. The panel carries the system's own bg-background
 * (the docs chrome never themes, the tokens do) — same reason the tokens
 * page's swatches paint their own var() backgrounds.
 */
export function TypeRamp({ children }: { children: ReactNode }) {
  return (
    <div className="sb-unstyled bg-background divide-border divide-y rounded-sm border px-5">
      {children}
    </div>
  )
}

interface TypeScaleStep {
  /** The ramp utility rendered at this step. */
  utility: string
  /** Real-usage pairing (e.g. `font-semibold`, `text-muted-foreground`). */
  className?: string
  /** Rendered px size, printed beside the utility name. */
  px: string
}

/**
 * The at-a-glance view: one sample repeated at every step of a ramp,
 * baseline-labelled — hierarchy shown as size and weight doing the work.
 * The detailed per-step meta lives in `TypeSpecimen` rows below it.
 */
export function TypeScale({
  label,
  steps,
  sample,
}: {
  /** Panel caption (e.g. "prose — Inter"). */
  label: string
  steps: TypeScaleStep[]
  sample: string
}) {
  return (
    <div className="sb-unstyled bg-background rounded-sm border px-5 py-4">
      <div className="text-label text-muted-foreground mb-4">{label}</div>
      <div className="flex flex-col gap-3">
        {steps.map(({ utility, className, px }) => (
          <div key={utility} className="flex items-baseline gap-6">
            <div className="text-label text-muted-foreground w-44 shrink-0">
              {utility} · {px}
            </div>
            <div
              className={cn(
                "text-foreground min-w-0 truncate font-sans",
                utility,
                className,
              )}
            >
              {sample}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TypeSpecimenProps {
  /** The ramp utility under documentation — applied to the sample and printed in the meta. */
  utility: string
  /** Real-usage pairing rendered with the utility (e.g. `font-semibold`, `text-muted-foreground`). */
  className?: string
  /** The specimen string. */
  sample: string
  /** Hand-authored meta, transcribed from globals.css / the stock Tailwind scale. */
  size: string
  lineHeight: string
  weight: string
  tracking?: string
  face: "Inter" | "JetBrains Mono"
  /** The real consumers of this step. */
  usedBy: string
  /** One-line caveat rendered under the meta. */
  note?: string
}

/** One ramp step: live sample (left) + meta grid (right). */
export function TypeSpecimen({
  utility,
  className,
  sample,
  size,
  lineHeight,
  weight,
  tracking = "normal",
  face,
  usedBy,
  note,
}: TypeSpecimenProps) {
  const fields: Array<{ label: string; value: string; mono?: boolean }> = [
    {
      label: "class",
      value: className ? `${utility} ${className}` : utility,
      mono: true,
    },
    { label: "size", value: size },
    { label: "line", value: lineHeight },
    { label: "weight", value: weight },
    { label: "tracking", value: tracking },
    { label: "face", value: face },
    { label: "used by", value: usedBy },
  ]

  return (
    <div className="sb-unstyled grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_19rem] sm:items-center sm:gap-10">
      <div
        className={cn(
          "text-foreground min-w-0",
          // text-label carries its own font-family (the mono voice); every
          // other step is Inter and must say so here, or it inherits the
          // Storybook docs theme font instead of the system's.
          face === "Inter" && "font-sans",
          utility,
          className,
        )}
      >
        {sample}
      </div>
      {/* plain divs, not dl/dt/dd — the Storybook docs stylesheet targets
          bare definition-list elements (italic bold dt, margins) and would
          override the system voices */}
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
