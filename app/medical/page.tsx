/**
 * Medical
 *
 * The clinical hub: appointments, providers, and clinical records — all in
 * tabs so caregivers never leave the page. Each tab renders the SAME panel used
 * by its standalone route (/appointments, /providers, /calendar), so there's
 * one source of truth per section.
 */

'use client'

import { useState } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { AppointmentsPanel } from '@/components/appointments/AppointmentsPanel'
import { ProvidersPanel } from '@/components/providers/ProvidersPanel'
import { CalendarPanel } from '@/components/calendar/CalendarPanel'
import { MedicalNotificationsPanel } from '@/components/notifications/MedicalNotificationsPanel'
import { ImportPanel } from '@/app/onboarding/import/page'

const TABS = [
  { key: 'appointments', label: 'Appointments' },
  { key: 'providers', label: 'Providers' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'import', label: 'Import' },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function MedicalPage() {
  return (
    <AuthGuard>
      <MedicalContent />
    </AuthGuard>
  )
}

function MedicalContent() {
  const [tab, setTab] = useState<TabKey>('appointments')

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Medical"
        subtitle="Manage appointments, providers, and clinical records"
        helpRoute="/docs/user-guides/medical"
      />

      <main className="container mx-auto px-4 py-8">
        {/* Tabs — touch-friendly (≥44px), keeps you on the page */}
        {/* overflow-y-hidden is load-bearing: `overflow-x-auto` alone makes CSS
            compute overflow-y to `auto` too, and the tabs sit ~1px taller than
            the row (min-h + -mb-px underline), so the browser drew a phantom
            vertical scrollbar (the stray ▲▼ arrows). Pin the y-axis shut. */}
        <div className="mb-6 flex gap-1 border-b border-border overflow-x-auto overflow-y-hidden" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 min-h-[44px] text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'appointments' && <AppointmentsPanel />}
        {tab === 'providers' && <ProvidersPanel />}
        {tab === 'calendar' && <CalendarPanel />}
        {tab === 'notifications' && <MedicalNotificationsPanel />}
        {tab === 'import' && <ImportPanel showHeader={false} />}
      </main>
    </div>
  )
}
