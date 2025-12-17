/**
 * Shopping Lists Management Page
 * Family Admin Route: /family-admin/shopping
 *
 * View and manage shopping lists for all households
 */

'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import Link from 'next/link'
import { ArrowLeftIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'

export default function ShoppingManagementPage() {
  return (
    <AuthGuard>
      <ShoppingContent />
    </AuthGuard>
  )
}

function ShoppingContent() {
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
        title="Shopping Lists"
        subtitle="View and manage shopping for all households"
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
            <p className="text-muted-foreground">Loading shopping lists...</p>
          </div>
        ) : households.length === 0 ? (
          <div className="bg-card rounded-lg border-2 border-border p-12 text-center">
            <ShoppingCartIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No Households Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create households first to manage shopping lists for each residence
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
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> Shopping lists are organized by household. Select a household below to view and manage its shopping list.
              </p>
            </div>

            {/* Household Shopping Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {households.map(household => (
                <Link
                  key={household.id}
                  href={`/shopping?household=${household.id}`}
                  className="bg-card rounded-lg border-2 border-border p-6 hover:border-primary-light hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-lime-100 dark:bg-lime-900/20 flex items-center justify-center flex-shrink-0">
                      <ShoppingCartIcon className="w-6 h-6 text-lime-600 dark:text-lime-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground mb-1">{household.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {household.address
                          ? `${household.address.street || ''}, ${household.address.city || ''}, ${household.address.state || ''} ${household.address.zipCode || ''}`.trim()
                          : 'No address set'}
                      </p>
                      <p className="text-sm text-primary mt-2">
                        View Shopping List →
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick Link to Main Shopping Page */}
            <div className="border-t border-border pt-6">
              <Link
                href="/shopping"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:underline"
              >
                Or go to main shopping page (default household) →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
