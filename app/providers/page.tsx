/**
 * Providers List Page
 *
 * View and manage all healthcare providers. The list itself lives in
 * ProvidersPanel (shared with the Medical hub's Providers tab).
 */

'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { ProvidersPanel } from '@/components/providers/ProvidersPanel'

export default function ProvidersPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Healthcare Providers"
          subtitle="Manage doctors, specialists, pharmacies, and more"
        />
        <main className="container mx-auto px-4 py-8">
          <ProvidersPanel />
        </main>
      </div>
    </AuthGuard>
  )
}
