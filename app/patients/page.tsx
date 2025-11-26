/**
 * Family Members List Page
 * Displays all family members for the current user
 */

'use client'

import { useState } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { PatientCard } from '@/components/patients/PatientCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { usePatientLimit } from '@/hooks/usePatientLimit'
import { useSubscription } from '@/hooks/useSubscription'
import { SubscriptionSimulator } from '@/components/dev/SubscriptionSimulator'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { PlanBadge } from '@/components/subscription/PlanBadge'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  getTrackingPageTitle,
  getTrackingPageSubtitle,
  getAddButtonText,
  getTrackingTerminology
} from '@/lib/user-role-helper'

export default function PatientsPage() {
  return (
    <AuthGuard>
      <PatientsContent />
    </AuthGuard>
  )
}

function PatientsContent() {
  const { patients, loading, error } = usePatients()
  const [filter, setFilter] = useState<'all' | 'human' | 'pet'>('all')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const { subscription, isAdmin } = useSubscription()
  const { current, max, canAdd, percentage } = usePatientLimit(patients.length)
  const { profile: userProfile } = useUserProfile()

  // Get dynamic terminology based on user role
  const pageTitle = getTrackingPageTitle(userProfile)
  const pageSubtitle = getTrackingPageSubtitle(userProfile)
  const addButtonText = getAddButtonText(userProfile)
  const terminology = getTrackingTerminology(userProfile)

  const filteredPatients = patients.filter(p => {
    if (filter === 'all') return true
    return p.type === filter
  })

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          canAdd ? (
            <Link
              href="/patients/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              {addButtonText}
            </Link>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
            >
              <span>🔒</span>
              Upgrade to Add More
            </button>
          )
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Member Limit Indicator */}
        {subscription && (
          <div className="mb-6 bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm font-medium text-foreground">
                {terminology}: {current} of {max}
              </p>
              <PlanBadge
                plan={subscription.plan}
                addons={subscription.addons}
                status={subscription.status}
                size="sm"
              />
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden w-48">
              <div
                className={`h-full rounded-full transition-all ${
                  percentage >= 100 ? 'bg-error' : percentage >= 80 ? 'bg-warning-dark' : 'bg-success'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            All ({patients.length})
          </button>
          <button
            onClick={() => setFilter('human')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'human'
                ? 'bg-primary text-white'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            Humans ({patients.filter(p => p.type === 'human').length})
          </button>
          <button
            onClick={() => setFilter('pet')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pet'
                ? 'bg-primary text-white'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            Pets ({patients.filter(p => p.type === 'pet').length})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 text-error-dark">
            <p className="font-medium">Error loading family members</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPatients.length === 0 && (
          <div className="bg-card rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-xl font-bold text-foreground mb-2">
              {filter === 'all' ? `No ${terminology} Yet` : `No ${filter}s Found`}
            </p>
            <p className="text-muted-foreground mb-6">
              Start tracking health records by adding your first {getTrackingTerminology(userProfile, { singular: true, lowercase: true })}
            </p>
            <Link
              href="/patients/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              {addButtonText}
            </Link>
          </div>
        )}

        {/* Family Member Grid */}
        {!loading && !error && filteredPatients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        )}
      </main>

      {/* Subscription Simulator (Dev Tool) */}
      <SubscriptionSimulator />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={subscription?.plan}
        suggestedUpgrade="plan"
      />
    </div>
  )
}
