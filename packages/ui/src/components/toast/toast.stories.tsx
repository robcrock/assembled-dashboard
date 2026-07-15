import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Toast } from "@workspace/ui/components/toast"

const meta: Meta<typeof Toast> = {
  title: "components/molecules/toast",
  component: Toast,
  parameters: {
    docs: {
      description: {
        component: `
One transient notice with a lifetime — the surface for the write side's two moments: **undo** ("3 rows removed · Undo" — a deferred delete counting down to its real commit) and **error** ("Couldn't save — change reverted" — an optimistic rollback announcing itself). The consumer owns the consequence: \`onExpire\` is where a deferred delete actually commits, \`onAction\` where it un-happens; the toast only renders the lifetime. Hovering or focusing PARKS the timer (you cannot read the undo away); leaving re-arms it in full.

**Tones are liveness registers, not decoration:** \`undo\` is \`role="status"\` (polite — an offer), \`error\` is \`role="alert"\` (assertive) with the destructive ring + breach-ink icon — a failed write is a broken promise and speaks in that color; everything else stays quiet popover ink.

**Placement is the consumer's** (the PageSection "no margins baked in" discipline): the component is the card; the page pins it (\`fixed right-6 bottom-6\` in the dashboard template). Baking \`position: fixed\` into the primitive would silently break inside any transformed ancestor — fixed resolves against a transform's containing block, not the viewport.

**Deliberately omitted:** stacking/queueing (one toast at a time IS the semantic — a newer intent supersedes, and the store commits the prior batch when it does), a portal manager, positioning (above), a progress bar (the timer parks on hover, so a draining bar would lie), and a close button on the undo tone (expiry IS the dismissal; acting is the alternative).
`,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Undo: Story = {
  args: {
    message: "3 rows removed",
    tone: "undo",
    actionLabel: "Undo",
    onAction: () => {},
    duration: 100_000_000,
  },
  parameters: {
    docs: {
      description: {
        story:
          "The deferred-commit face: the rows are already gone optimistically; the real DELETE fires when this expires. Duration is inflated here so the catalog specimen holds still.",
      },
    },
  },
}

export const ErrorTone: Story = {
  name: "Error",
  args: {
    message: "Couldn't save — your change was reverted.",
    tone: "error",
    duration: 100_000_000,
  },
  parameters: {
    docs: {
      description: {
        story:
          "The rollback face: an optimistic edit failed server-side and the value snapped back to truth. No action — there is nothing to undo; the destructive ring and assertive announcement carry the severity.",
      },
    },
  },
}

export const LongMessage: Story = {
  args: {
    message:
      "Billing, Live Chat, and 4 other queues were removed from the floor view",
    tone: "undo",
    actionLabel: "Undo",
    onAction: () => {},
    duration: 100_000_000,
  },
}

function ExpiryDemo() {
  const [log, setLog] = useState<string[]>([])
  const [key, setKey] = useState(0)
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setKey((k) => k + 1)
            setVisible(true)
          }}
        >
          Delete something
        </Button>
      </div>
      <div className="text-metric-sm text-muted-foreground">
        {log.length === 0 ? "No intents yet." : log.join(" · ")}
      </div>
      {visible && (
        <Toast
          key={key}
          message="1 row removed"
          tone="undo"
          actionLabel="Undo"
          duration={4000}
          onAction={() => {
            setLog((l) => [...l, "UNDONE (delete cancelled)"])
            setVisible(false)
          }}
          onExpire={() => {
            setLog((l) => [...l, "COMMITTED (DELETE fired)"])
            setVisible(false)
          }}
        />
      )}
    </div>
  )
}

export const DeferredCommit: Story = {
  render: () => <ExpiryDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "The live contract: click the button and either let the 4s lifetime expire (the consumer logs COMMITTED — where the real DELETE fires) or click Undo (logs UNDONE — the pending request is cancelled). Hover the toast and the countdown parks.",
      },
    },
  },
}
