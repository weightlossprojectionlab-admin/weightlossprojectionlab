/**
 * Kitchen Inventory Management Page
 * Family Admin Route: /family-admin/inventory
 *
 * Track food inventory across all households
 */

'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import Link from 'next/link'
import { ArrowLeftIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'

import { getCSRFToken } from '@/lib/csrf'
export default function InventoryManagementPage() {
  return (
    <AuthGuard>
      <InventoryContent />
    </AuthGuard>
  )
}

function InventoryContent() {
  const [households, setHouseholds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHouseholds()
  }, [])

  const fetchHouseholds = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()
      const response = await fetch('/api/households', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setHouseholds(data.households || [])
      }
    } catch (error) {
      logger.error('Failed to fetch households', error as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Kitchen Inventory"
        subtitle="Track food inventory across all households"
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
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        ) : households.length === 0 ? (
          <div className="bg-card rounded-lg border-2 border-border p-12 text-center">
            <ArchiveBoxIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No Households Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create households first to manage kitchen inventory for each residence
            </p>
            <Link
              href="/family-admin/households"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Manage Households
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                <strong>Tip:</strong> Kitchen inventory is organized by household. Select a household below to view and manage its inventory.
              </p>
            </div>

            {/* Household Inventory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {households.map(household => (
                <Link
                  key={household.id}
                  href={`/inventory?household=${household.id}`}
                  className="bg-card rounded-lg border-2 border-border p-6 hover:border-primary-light hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                      <ArchiveBoxIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground mb-1">{household.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {household.address || 'No address set'}
                      </p>
                      <p className="text-sm text-primary mt-2">
                        View Kitchen Inventory →
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick Links */}
            <div className="border-t border-border pt-6 space-y-2">
              <Link
                href="/inventory"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:underline"
              >
                Or go to main inventory page (default household) →
              </Link>
              <br />
              <Link
                href="/inventory/cleanup"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:underline"
              >
                🗑️ Expired Items Cleanup →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
