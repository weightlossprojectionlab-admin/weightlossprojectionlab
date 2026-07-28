/**
 * Family Calendar Page
 * View all family appointments in a month layout. The calendar itself lives in
 * CalendarPanel (shared with the Medical hub's Calendar tab).
 */

'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { CalendarPanel } from '@/components/calendar/CalendarPanel'

export default function CalendarPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Family Calendar"
          subtitle="View all appointments for your family"
          backHref="/medical"
        />
        <main className="container mx-auto px-4 py-8">
          <CalendarPanel />
        </main>
      </div>
    </AuthGuard>
  )
}
