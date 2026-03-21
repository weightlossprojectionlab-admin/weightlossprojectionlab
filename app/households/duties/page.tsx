'use client'

/**
 * Household Duties Page
 *
 * Allows household owners and caregivers to manage household care duties:
 * laundry, shopping, cleaning (bedroom/bathroom/kitchen), and custom duties.
 *
 * Route: /households/duties
 * Route: /households/duties?householdId=<id>
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { DutyListView } from '@/components/household/DutyListView'
import { CaregiverDutyDashboard } from '@/components/household/CaregiverDutyDashboard'
import { DutyCalendarView } from '@/components/household/DutyCalendarView'
import { DutyAnalytics } from '@/components/household/DutyAnalytics'
import { DutyTemplatesManager } from '@/components/household/DutyTemplatesManager'
import { useHouseholdDuties } from '@/hooks/useHouseholdDuties'
import type { Household } from '@/types/household'
import type { CaregiverProfile } from '@/types/caregiver'

type DutyTab = 'list' | 'caregivers' | 'calendar' | 'analytics' | 'templates'

const DUTY_TABS: { id: DutyTab; label: string }[] = [
  { id: 'list', label: 'Duties' },
  { id: 'caregivers', label: 'Caregivers' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'templates', label: 'Templates' },
]

export default function HouseholdDutiesPage() {
  return (
    <AuthGuard>
      <HouseholdDutiesContent />
    </AuthGuard>
  )
}

function HouseholdDutiesContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const paramHouseholdId = searchParams.get('householdId')

  const [households, setHouseholds] = useState<Household[]>([])
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(
    paramHouseholdId || null
  )
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DutyTab>('list')

  // Shared duties hook for non-list tabs
  const {
    duties: allDuties,
    stats,
    refetch: refetchDuties,
    createDuty,
    updateDuty,
  } = useHouseholdDuties({
    householdId: selectedHouseholdId || '',
    autoFetch: !!selectedHouseholdId && activeTab !== 'list',
  })

  // Load user's households
  useEffect(() => {
    if (!user) return

    const loadHouseholds = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch households where the user is owner or caregiver
        const householdsRef = collection(db, 'households')

        // Query households created by this user
        const ownedQuery = query(householdsRef, where('createdBy', '==', user.uid))
        const ownedSnapshot = await getDocs(ownedQuery)

        const ownedHouseholds: Household[] = ownedSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Household))

        // Also find households where user is a caregiver
        const caregiverQuery = query(
          householdsRef,
          where('additionalCaregiverIds', 'array-contains', user.uid)
        )
        const caregiverSnapshot = await getDocs(caregiverQuery)

        const caregiverHouseholds: Household[] = caregiverSnapshot.docs
          .filter(d => !ownedHouseholds.some(h => h.id === d.id)) // avoid duplicates
          .map(d => ({ id: d.id, ...d.data() } as Household))

        const allHouseholds = [...ownedHouseholds, ...caregiverHouseholds]
          .filter(h => h.isActive !== false)

        setHouseholds(allHouseholds)

        // Select first household if none specified in URL
        if (!selectedHouseholdId && allHouseholds.length > 0) {
          setSelectedHouseholdId(allHouseholds[0].id)
        }
      } catch (err) {
        logger.error('[HouseholdDutiesPage] Error loading households', err as Error)
        setError('Failed to load households')
      } finally {
        setLoading(false)
      }
    }

    loadHouseholds()
  }, [user, selectedHouseholdId])

  // Load caregivers for selected household
  useEffect(() => {
    if (!selectedHouseholdId) return

    const loadCaregivers = async () => {
      try {
        const householdDoc = await getDoc(doc(db, 'households', selectedHouseholdId))
        if (!householdDoc.exists()) return

        const household = householdDoc.data() as Household
        const caregiverIds = [
          household.primaryCaregiverId,
          ...(household.additionalCaregiverIds || [])
        ].filter(Boolean)

        const caregiverProfiles: CaregiverProfile[] = []

        for (const caregiverId of caregiverIds) {
          try {
            const userDoc = await getDoc(doc(db, 'users', caregiverId))
            if (userDoc.exists()) {
              const data = userDoc.data()
              caregiverProfiles.push({
                id: caregiverId,
                userId: caregiverId,
                name: data.displayName || data.email || 'Caregiver',
                email: data.email || '',
                ...data
              } as unknown as CaregiverProfile)
            }
          } catch (err) {
            logger.warn('[HouseholdDutiesPage] Failed to fetch caregiver', {
              caregiverId,
              error: (err as Error).message
            })
          }
        }

        setCaregivers(caregiverProfiles)
      } catch (err) {
        logger.error('[HouseholdDutiesPage] Error loading caregivers', err as Error)
      }
    }

    loadCaregivers()
  }, [selectedHouseholdId])

  const selectedHousehold = households.find(h => h.id === selectedHouseholdId)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Household Duties"
          subtitle="Manage care tasks for your households"
        />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Household Duties"
          subtitle="Manage care tasks for your households"
        />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (households.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Household Duties"
          subtitle="Manage care tasks for your households"
        />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-foreground mb-3">No Households Found</h2>
            <p className="text-muted-foreground mb-6">
              Create a household first to start managing duties.
            </p>
            <a
              href="/households"
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Go to Households
            </a>
          </div>
        </main>
      </div>
    )
  }

  const handleAssignDuty = async (dutyId: string, caregiverId: string) => {
    try {
      const duty = allDuties.find(d => d.id === dutyId)
      if (!duty) return
      await updateDuty(dutyId, {
        assignedTo: [...(duty.assignedTo || []), caregiverId],
      })
      await refetchDuties()
    } catch {
      // Error handled by hook
    }
  }

  const handleApplyTemplate = async (dutyRequests: Parameters<typeof createDuty>[0][]) => {
    for (const req of dutyRequests) {
      await createDuty(req)
    }
    await refetchDuties()
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Household Duties"
        subtitle="Manage care tasks assigned to caregivers"
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Household Switcher (if multiple) */}
        {households.length > 1 && (
          <div className="mb-4">
            <select
              value={selectedHouseholdId || ''}
              onChange={(e) => setSelectedHouseholdId(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
            >
              {households.map(h => (
                <option key={h.id} value={h.id}>{h.name || h.id}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-accent rounded-xl p-1 mb-6 overflow-x-auto">
          {DUTY_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'list' && (
          <DutyListView
            householdId={selectedHouseholdId!}
            householdName={selectedHousehold?.name || 'Household'}
            caregivers={caregivers}
          />
        )}

        {activeTab === 'caregivers' && (
          <CaregiverDutyDashboard
            duties={allDuties}
            caregivers={caregivers}
            onAssignDuty={handleAssignDuty}
          />
        )}

        {activeTab === 'calendar' && (
          <DutyCalendarView
            duties={allDuties}
            caregivers={caregivers}
          />
        )}

        {activeTab === 'analytics' && (
          <DutyAnalytics
            duties={allDuties}
            stats={stats}
            caregivers={caregivers}
          />
        )}

        {activeTab === 'templates' && (
          <DutyTemplatesManager
            householdId={selectedHouseholdId!}
            onApplyTemplate={handleApplyTemplate}
          />
        )}
      </main>
    </div>
  )
}
