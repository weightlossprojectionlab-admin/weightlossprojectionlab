/**
 * Households Management Page
 *
 * Allows caregivers to manage multiple physical residences where
 * their family members live. Each household has separate kitchen
 * inventory and shopping lists.
 */

'use client'

import { HouseholdManager } from '@/components/households/HouseholdManager'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'

export default function HouseholdsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Manage Households"
          subtitle="Organize family members by where they live"
        />

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <HouseholdManager />
        </main>
      </div>
    </AuthGuard>
  )
}
