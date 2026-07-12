import type { StorybookConfig } from "@storybook/react-vite"

// The catalog is a second real consumer of @workspace/ui: stories stay
// colocated beside their component in packages/ui; this workspace only owns
// the Storybook config.
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  // .mdx picks up the system docs pages (packages/ui/src/docs) — the
  // catalog carries the system's rules, not just its canvases.
  stories: [
    "../../../packages/ui/src/**/*.mdx",
    "../../../packages/ui/src/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-docs",
  ],
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import("vite")
    const tailwindcss = (await import("@tailwindcss/vite")).default
    return mergeConfig(viteConfig, { plugins: [tailwindcss()] })
  },
}

export default config
