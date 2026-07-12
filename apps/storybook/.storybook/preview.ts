import type { Preview } from "@storybook/react-vite"
import { withThemeByClassName } from "@storybook/addon-themes"

import "@workspace/ui/globals.css"

// Light/dark switches by toggling the `.dark` class on <html> — exactly how
// the app themes (next-themes), so stories exercise the same token remaps.
const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
      parentSelector: "html",
    }),
  ],
  // Every component gets an autodocs page: the prop-level JSDoc in
  // packages/ui becomes the props table, and each meta's
  // parameters.docs.description carries the when-to-use reasoning.
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    // body bg/text come from the token stylesheet; SB backgrounds would lie
    backgrounds: { disable: true },
    options: {
      // The docs pages are a reading order, not a list — alphabetical would
      // bury the introduction. Component groups keep default order inside
      // their tier. Entries are exact title-segment strings, so
      // "spacing & misc." must match the Meta title verbatim.
      storySort: {
        order: [
          "introduction",
          "components",
          ["atoms", "molecules"],
          "typography",
          "colors",
          "icons",
          "spacing & misc.",
          "rules",
          ["token-tiers", "color-law", "feed-states", "brand"],
          "skills",
          "*",
        ],
      },
    },
  },
}

export default preview
