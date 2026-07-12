import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

// Whitelabel identity: a tenant's monogram tile, name, and tagline — the
// block that anchors any whitelabel page. The name arrives as DATA (never
// hardcoded branding): `null` renders skeletons that mirror the final layout,
// so identity resolves without shift when the first payload lands.
//
// Deliberately fixed: the name renders as the page's <h1> (an identity block
// anchors exactly one page — a second heading level would mean this is the
// wrong component), and the monogram derives from the name's first character
// (no logo-upload surface in this system). No size prop until a second
// consumer needs a different scale.

interface OrgIdentityProps {
  /** Tenant display name from the feed; null shows loading skeletons. */
  name: string | null
  /** Muted line under the name (e.g. what this page is). */
  tagline?: string
  /** Where the identity links; every identity block is a home link. No consumer overrides it yet — kept for multi-page whitelabel shells (the debt it prevents). */
  href?: string
  className?: string
}

function OrgIdentity({
  name,
  tagline,
  href = "/",
  className,
}: OrgIdentityProps) {
  return (
    <a
      href={href}
      aria-label="Homepage"
      // focus-ring: the system's ONE keyboard-focus treatment — without it
      // this link was the page's only interactive element on the UA default
      // outline (found in the ROB-79 keyboard audit)
      className={cn("focus-ring flex min-w-0 items-center gap-4 rounded-lg", className)}
    >
      {name ? (
        <div
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-lg bg-primary text-xl font-semibold text-primary-foreground"
        >
          {name.charAt(0)}
        </div>
      ) : (
        <Skeleton className="size-14 shrink-0 rounded-lg" />
      )}
      <div className="min-w-0">
        {name ? (
          <h1 className="truncate text-2xl font-semibold">{name}</h1>
        ) : (
          <Skeleton className="h-7 w-56" />
        )}
        {tagline && (
          <p className="truncate text-sm text-muted-foreground">{tagline}</p>
        )}
      </div>
    </a>
  )
}

export { OrgIdentity }
