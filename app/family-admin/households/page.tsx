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
          {/* Quick Link to Household Duties */}
          <div className="mb-6 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🏠</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Manage Household Duties
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Assign and track household tasks like laundry, cleaning, shopping, and meal preparation for each family member.
                </p>
                <Link
                  href="/family/dashboard?tab=duties"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                >
                  Go to Household Duties →
                </Link>
              </div>
            </div>
          </div>

          <HouseholdManager />
        </main>
      </div>
    </AuthGuard>
  )
}
