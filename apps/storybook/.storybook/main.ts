import type { StorybookConfig } from "@storybook/react-vite"
import remarkGfm from "remark-gfm"

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
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            // GFM is not in Storybook's MDX pipeline by default — without it
            // the system pages' markdown tables render as pipe soup.
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import("vite")
    const tailwindcss = (await import("@tailwindcss/vite")).default
    return mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
      // Base UI subpath imports live inside @workspace/ui SOURCE (linked, so
      // Vite's startup scan doesn't crawl them); without pre-bundling they
      // get discovered on first story render, and the mid-render dep
      // optimization crashes that pass with a null-useContext (the error
      // boundary recovers, but every cold load flashes the crash). Listing
      // them keeps the first render clean.
      optimizeDeps: {
        include: [
          "@base-ui/react/checkbox",
          "@base-ui/react/input",
          "@base-ui/react/menu",
          "@base-ui/react/select",
          "@base-ui/react/tooltip",
        ],
      },
      // pnpm gives @workspace/ui and this workspace separate react copies on
      // disk; dedupe forces one module instance so Base UI hooks resolve the
      // renderer's dispatcher (without it, Field-integrated primitives crash
      // their first render pass with a null-useContext).
      resolve: {
        dedupe: ["react", "react-dom"],
      },
    })
  },
}

export default config
