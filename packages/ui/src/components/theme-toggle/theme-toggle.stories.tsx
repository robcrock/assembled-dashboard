import type { Meta, StoryObj } from "@storybook/react-vite"
import { ThemeProvider } from "next-themes"

import { ThemeToggle } from "@workspace/ui/components/theme-toggle"

// next-themes is framework-agnostic; the story provides its own provider.
// Note: clicking the toggle here changes the same .dark class the Storybook
// toolbar controls — both drive the real token remap.
const meta: Meta<typeof ThemeToggle> = {
  title: "primitives/theme-toggle",
  component: ThemeToggle,
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
