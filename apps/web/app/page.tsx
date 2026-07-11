import { Dashboard } from "@/app/dashboard"

// Composition root for the dashboard — route: `/`.
//
// Static Server Component shell; the live dashboard (including the header) is
// one Client Component (app/dashboard.tsx) that owns useDashboardData() and
// passes { data, feed } to the feature sections. The header lives inside the
// client boundary because the UI is whitelabel: the operating company's
// identity arrives as data (meta.org), never as hardcoded branding — so
// nothing brand-shaped can be server-rendered. We deliberately do NOT
// server-render live data.
export default function Page() {
  return <Dashboard />
}
