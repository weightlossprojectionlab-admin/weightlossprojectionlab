/**
 * Appointments List Page
 * View and manage all appointments. The list lives in AppointmentsPanel
 * (shared with the Medical hub's Appointments tab).
 */

'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { AppointmentsPanel } from '@/components/appointments/AppointmentsPanel'

export default function AppointmentsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Appointments"
          subtitle="Manage medical appointments"
          backHref="/medical"
        />
        <main className="container mx-auto px-4 py-8">
          <AppointmentsPanel />
        </main>
      </div>
    </AuthGuard>
  )
}
