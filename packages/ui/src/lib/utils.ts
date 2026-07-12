import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge only knows stock utilities: without registration it
// classifies the custom text-metric-* ramp as text COLORS, so a call like
// cn("text-metric-sm", "text-muted-foreground") silently DROPS the ramp step
// (and cn("text-foreground", "text-metric-xl") would drop the ink). Register
// the ramp as font-size classes so size and color merge independently —
// every custom text-* composite minted in globals.css must be added here.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-metric-xl",
        "text-metric-lg",
        "text-metric",
        "text-metric-sm",
        "text-label",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
