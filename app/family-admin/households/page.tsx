/**
 * Households Management Page
 * Family Admin Route: /family-admin/households
 *
 * Allows caregivers to manage multiple physical residences where
 * their family members live. Each household has separate kitchen
 * inventory and shopping lists.
 */

'use client'

import { HouseholdManager } from '@/components/households/HouseholdManager'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function HouseholdsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Manage Households"
          subtitle="Organize family members by where they live"
          actions={
            <Link
              href="/family-admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
          }
        />

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <HouseholdManager />
        </main>
      </div>
    </AuthGuard>
  )
}
