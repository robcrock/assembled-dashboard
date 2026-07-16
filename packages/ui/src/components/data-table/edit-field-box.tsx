import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// The one field frame — edit mode's whole vocabulary in a single recipe.
//
// A BOX MEANS A FIELD. Nothing else in the table wears this border, so the
// eye can sweep a row in edit mode and know what it may change without
// touching anything. That only holds while there is exactly ONE recipe:
// three hand-rolled `border border-input` spans would drift a pixel apart
// and the rule would quietly become a suggestion.
//
// Two consumers, one shape:
//   - DataTable's simple editable cells, where the whole value IS the field
//     (the cell button wears EDIT_FIELD_FRAME directly and boxes itself).
//   - A column's `editCell`, where only PART of a compound cell is a field
//     (`48s / [3m]`, `In meeting · 5m`) — the observed half must stay
//     outside the box, or the frame promises an edit the cell won't honour.
//
// Height is the flush editor's (h-6): clicking swaps box for editor without
// moving anything, because they measure the same.

/**
 * The group name an editable cell's button wears, so a compound cell's box can
 * answer a hover landing anywhere in the cell. NAMED, not a bare `group`:
 * `TableRow` is already hoverable and any ancestor could later take a `group`,
 * and `group-hover:` matches ANY `.group` ancestor — an unnamed group would let
 * a row hover light up every box in it. This name is a contract between this
 * file and `EditableCell`; the two must move together.
 */
export const EDIT_CELL_GROUP = "group/editcell"

/**
 * The frame itself, as classes — for a container that supplies its own
 * layout/interaction (DataTable's cell button).
 *
 * The border is muted INK at low alpha, deliberately not `border-input`:
 * `--input`, `--border` and `--muted` all resolve to the same concrete step,
 * so an input-bordered box sitting on a selected row (`bg-muted`) draws its
 * border in exactly the row's own colour and vanishes — selection would
 * erase the very affordance that says "this is editable". Ink at 30% keeps
 * the hairline legible on the page surface AND on a selected row, in both
 * themes, without hardening into a heavy outline.
 *
 * The frame carries BOTH hover triggers so the two cell kinds respond
 * identically by construction rather than by agreement:
 *   - `hover:` fires for a SIMPLE cell, whose button IS the frame.
 *   - `group-hover/editcell:` fires for a COMPOUND cell's box, when the
 *     pointer is anywhere in the cell — the box is the affordance, the cell
 *     is just the hit area, so the box is what must answer.
 * A compound box hovered directly matches both; they declare the same thing,
 * so there is nothing to resolve.
 */
export const EDIT_FIELD_FRAME =
  "h-6 rounded-sm border border-muted-foreground/30 bg-transparent px-2 transition-colors hover:border-ring hover:bg-muted/40 group-hover/editcell:border-ring group-hover/editcell:bg-muted/40"

interface EditFieldBoxProps {
  children: React.ReactNode
  className?: string
}

/**
 * A resting field affordance for the editable PART of a compound cell — the
 * boxed half of `48s / [3m]`. Inline-sized: it wraps its value, so the
 * read-only context beside it keeps its own width.
 */
function EditFieldBox({ children, className }: EditFieldBoxProps) {
  return (
    <span
      className={cn(
        "text-metric inline-flex min-w-0 items-center",
        EDIT_FIELD_FRAME,
        className
      )}
    >
      {children}
    </span>
  )
}

export { EditFieldBox }
