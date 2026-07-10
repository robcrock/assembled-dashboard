import { ThemeToggle } from "@workspace/ui/components/theme-toggle"

import { Dashboard } from "@/app/dashboard"

// Composition root for the dashboard — route: `/`.
//
// Static Server Component shell; the live dashboard is one Client Component
// (app/dashboard.tsx) that owns useDashboardData() and passes { data, status }
// to the feature sections. We deliberately do NOT server-render live data.
export default function Page() {
  return (
    <div className="min-h-svh">
      <header className="flex items-baseline justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Floor Status</h1>
          <p className="text-muted-foreground text-sm">
            Real-time contact-center operations
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl p-6">
        <Dashboard />
      </main>
    </div>
  )
}
