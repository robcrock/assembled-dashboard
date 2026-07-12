import type { Meta, StoryObj } from "@storybook/react-vite"
import { ThemeProvider } from "next-themes"

import { ThemeToggle } from "@workspace/ui/components/theme-toggle"

// next-themes is framework-agnostic; the story provides its own provider.
const meta: Meta<typeof ThemeToggle> = {
  title: "components/atoms/theme-toggle",
  component: ThemeToggle,
  parameters: {
    docs: {
      description: {
        component: `
A light/dark flip button on next-themes — a ghost icon \`Button\` with sun/moon icons.

**Catalog-only:** the dashboard follows OS appearance (\`prefers-color-scheme\`) and mounts no toggle; this primitive exists so the catalog can demonstrate that light/dark is real. Clicking it here changes the same \`.dark\` class the Storybook toolbar controls — both drive the real token remap.

**Deliberately omitted:** all props — including a light/dark/system menu (a binary flip suffices), and any size/variant knobs.

Implementation notes worth knowing before reuse: both icons are always rendered and CSS (\`dark:\`) picks the visible one — no mounted-state dance, no hydration mismatch, no flash. Keyboard operable for free via \`Button\`. Requires a next-themes \`ThemeProvider\` (\`attribute="class"\`) above it.
`,
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light">
        <Story />
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
