import { addons } from "storybook/manager-api"

addons.setConfig({
  sidebar: {
    // Without this, Storybook renders top-level groups (components, rules,
    // skills) as uppercase section headers BELOW every root-level docs page,
    // breaking the deliberate reading order. As plain folders, the sidebar
    // follows storySort exactly: introduction, components, typography,
    // colors, icons, spacing & misc., rules, skills.
    showRoots: false,
  },
})
