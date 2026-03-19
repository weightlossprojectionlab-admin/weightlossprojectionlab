/**
 * Caregiver-Only Dashboard
 *
 * Minimal view for users who are ONLY caregivers (no personal account)
 * Shows assigned patients from the account owner's family plan
 * Limited permissions and navigation
 */

'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useHouseholdDuties } from '@/hooks/useHouseholdDuties'
import type { CaregiverContext } from '@/types'
import type { PatientProfile } from '@/types/medical'
import type { HouseholdDuty, DutyStatus, DutyPriority } from '@/types/household-duties'

interface CaregiverDashboardPageProps {
  params: Promise<{
    accountOwnerId: string
  }>
}

export default function CaregiverDashboardPage({ params }: CaregiverDashboardPageProps) {
  return (
    <AuthGuard>
      <CaregiverDashboardContent params={params} />
    </AuthGuard>
  )
}

// ==================== DUTY STATUS / PRIORITY HELPERS ====================

function getPriorityBadgeClass(priority: DutyPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border border-red-300'
    case 'high':
      return 'bg-orange-100 text-orange-800 border border-orange-300'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    case 'low':
      return 'bg-blue-100 text-blue-800 border border-blue-300'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300'
  }
}

function getStatusBadgeClass(status: DutyStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'overdue':
      return 'bg-red-100 text-red-800'
    case 'skipped':
      return 'bg-orange-100 text-orange-800'
    case 'pending':
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getDueDaysLabel(nextDueDate?: string): string | null {
  if (!nextDueDate) return null
  const now = new Date()
  const due = new Date(nextDueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  return `Due in ${diffDays} days`
}

// ==================== MY DUTIES SECTION ====================

interface MyDutiesSectionProps {
  householdId: string
  caregiverUserId: string
}

function MyDutiesSection({ householdId, caregiverUserId }: MyDutiesSectionProps) {
  const [statusFilter, setStatusFilter] = useState<DutyStatus | 'all'>('all')
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [completionError, setCompletionError] = useState<string | null>(null)

  const { duties, stats, loading, error, completeDuty, refetch } = useHouseholdDuties({
    householdId,
    statusFilter,
    autoFetch: true
  })

  // Filter client-side to only duties assigned to this caregiver
  const myDuties = duties.filter(d => d.assignedTo.includes(caregiverUserId))

  const handleComplete = async (duty: HouseholdDuty) => {
    try {
      setCompletingIds(prev => new Set(prev).add(duty.id))
      setCompletionError(null)
      await completeDuty(duty.id)
      await refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark duty complete'
      setCompletionError(msg)
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(duty.id)
        return next
      })
    }
  }

  const statusTabs: { label: string; value: DutyStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Overdue', value: 'overdue' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-muted-foreground text-sm">Loading duties...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-700 dark:text-red-300 font-medium mb-2">Failed to load duties</p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-lg border border-border p-3 text-center">
            <div className="text-xl font-bold text-foreground">{myDuties.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">My Duties</div>
          </div>
          <div className="bg-card rounded-lg border border-border p-3 text-center">
            <div className="text-xl font-bold text-green-600">{stats.completedThisWeek}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Done This Week</div>
          </div>
          <div className="bg-card rounded-lg border border-border p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{stats.byStatus.pending}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Pending</div>
          </div>
          <div className="bg-card rounded-lg border border-border p-3 text-center">
            <div className="text-xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Overdue</div>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error completing duty */}
      {completionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
          {completionError}
        </div>
      )}

      {/* Duty list */}
      {myDuties.length === 0 ? (
        <div className="bg-card rounded-lg border-2 border-border p-10 text-center">
          <svg
            className="w-12 h-12 text-muted-foreground mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-muted-foreground font-medium">
            {statusFilter === 'all'
              ? 'No duties assigned to you yet'
              : `No ${statusFilter.replace('_', ' ')} duties`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            The account owner can assign household duties to you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myDuties.map(duty => {
            const isCompleting = completingIds.has(duty.id)
            const dueDaysLabel = getDueDaysLabel(duty.nextDueDate)
            const isAlreadyDone = duty.status === 'completed'

            return (
              <div
                key={duty.id}
                className="bg-card rounded-lg border-2 border-border p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-foreground truncate">{duty.name}</h4>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityBadgeClass(duty.priority)}`}
                      >
                        {duty.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusBadgeClass(duty.status)}`}
                      >
                        {duty.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Description */}
                    {duty.description && (
                      <p className="text-sm text-muted-foreground mb-2">{duty.description}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="capitalize">{duty.frequency.replace('_', ' ')}</span>
                      {duty.estimatedDuration && (
                        <span>{duty.estimatedDuration} min</span>
                      )}
                      {dueDaysLabel && (
                        <span
                          className={
                            duty.status === 'overdue'
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : ''
                          }
                        >
                          {dueDaysLabel}
                        </span>
                      )}
                    </div>

                    {/* Category badge */}
                    <div className="mt-2">
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">
                        {duty.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Subtasks */}
                    {duty.subtasks && duty.subtasks.length > 0 && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary hover:underline">
                            {duty.subtasks.length} subtask{duty.subtasks.length !== 1 ? 's' : ''}
                          </summary>
                          <ul className="ml-4 mt-1 space-y-1 text-muted-foreground list-disc">
                            {duty.subtasks.map((task, i) => (
                              <li key={i}>{task}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}

                    {/* Notes */}
                    {duty.notes && (
                      <p className="mt-2 text-xs text-muted-foreground italic">{duty.notes}</p>
                    )}
                  </div>

                  {/* Complete button */}
                  <div className="flex-shrink-0">
                    {isAlreadyDone ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Done</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleComplete(duty)}
                        disabled={isCompleting}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        {isCompleting ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Mark Done</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================== MAIN DASHBOARD ====================

type ActiveTab = 'patients' | 'duties'

function CaregiverDashboardContent({ params }: CaregiverDashboardPageProps) {
  const resolvedParams = use(params)
  const { accountOwnerId } = resolvedParams
  const { user } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<ActiveTab>('patients')
  const [caregiverContext, setCaregiverContext] = useState<CaregiverContext | null>(null)
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasOwnAccount, setHasOwnAccount] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadCaregiverData = async () => {
      try {
        setLoading(true)

        // Get user's profile to check caregiverOf and onboarding status
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const userData = userDoc.data()

        if (!userData) {
          console.error('User data not found')
          router.push('/auth')
          return
        }

        // Check if user has completed their own onboarding
        const hasCompletedOnboarding = userData.profile?.onboardingCompleted || false
        setHasOwnAccount(hasCompletedOnboarding)

        // Find the caregiver context for this account owner
        const caregiverContexts = userData.caregiverOf || []
        const context = caregiverContexts.find(
          (ctx: CaregiverContext) => ctx.accountOwnerId === accountOwnerId
        )

        if (!context) {
          console.error('Caregiver context not found for this account owner')
          router.push('/dashboard')
          return
        }

        setCaregiverContext(context)

        // Fetch assigned patients via API (uses admin SDK for proper access)
        const token = await user.getIdToken()
        const response = await fetch(`/api/caregiver/${accountOwnerId}/patients`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch patients')
        }

        const result = await response.json()
        if (result.success) {
          setPatients(result.data.patients || [])
        } else {
          console.error('Failed to fetch patients:', result.error)
        }

        // Look up the household(s) owned by the account owner so we can
        // show duties assigned to this caregiver
        try {
          const householdsRef = collection(db, 'households')
          const ownedQuery = query(householdsRef, where('createdBy', '==', accountOwnerId))
          const ownedSnapshot = await getDocs(ownedQuery)

          // Also search households where this caregiver is listed
          const assignedQuery = query(
            householdsRef,
            where('additionalCaregiverIds', 'array-contains', user.uid)
          )
          const assignedSnapshot = await getDocs(assignedQuery)

          const allIds = new Set<string>()
          ownedSnapshot.docs.forEach(d => allIds.add(d.id))
          assignedSnapshot.docs.forEach(d => allIds.add(d.id))

          const firstId = allIds.values().next().value
          if (firstId) {
            setHouseholdId(firstId)
          }
        } catch (err) {
          // Non-fatal: duties section will gracefully not render
          console.error('Could not resolve household for duties:', err)
        }
      } catch (error) {
        console.error('Error loading caregiver data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCaregiverData()
  }, [user, accountOwnerId, router])

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading caregiver dashboard...</p>
        </div>
      </div>
    )
  }

  if (!caregiverContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-error-dark">Access denied</p>
        </div>
      </div>
    )
  }

  const permissionCount = Object.values(caregiverContext.permissions).filter(Boolean).length

  return (
    <div className="min-h-screen bg-background">
      {/* Caregiver Mode Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Caregiver Mode</p>
              <p className="text-xs opacity-90">
                Viewing {caregiverContext.accountOwnerName}'s family records
              </p>
            </div>
          </div>
          {!hasOwnAccount && (
            <button
              onClick={() => router.push('/onboarding')}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Create My Own Account
            </button>
          )}
        </div>
      </div>

      <PageHeader
        title={`${caregiverContext.accountOwnerName}'s Care Team`}
        subtitle={`You have ${permissionCount} permissions for ${patients.length} patient${patients.length !== 1 ? 's' : ''}`}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Access Summary Card */}
        <div className="bg-card rounded-lg border-2 border-border p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Access</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Role</p>
              <p className="text-lg font-medium text-foreground capitalize">
                {caregiverContext.role.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Assigned Patients</p>
              <p className="text-lg font-medium text-foreground">{patients.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Permissions</p>
              <p className="text-lg font-medium text-foreground">
                {permissionCount} granted
              </p>
            </div>
          </div>

          {/* Permissions List */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">What you can do:</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {Object.entries(caregiverContext.permissions)
                .filter(([_, granted]) => granted)
                .map(([permission, _]) => (
                  <div key={permission} className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-success-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-foreground capitalize">
                      {permission.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'patients'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Assigned Patients
            {patients.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                {patients.length}
              </span>
            )}
          </button>

          {householdId && (
            <button
              onClick={() => setActiveTab('duties')}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'duties'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              My Duties
            </button>
          )}
        </div>

        {/* Tab content: Assigned Patients */}
        {activeTab === 'patients' && (
          <div>
            {patients.length === 0 ? (
              <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
                <p className="text-muted-foreground">No patients assigned yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    className="bg-card rounded-lg border-2 border-border p-6 hover:border-primary transition-colors text-left"
                  >
                    <div className="flex items-start gap-4">
                      {patient.photo ? (
                        <img
                          src={patient.photo}
                          alt={patient.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
                          <span className="text-primary font-semibold text-xl">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{patient.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{patient.relationship}</p>
                        {patient.dateOfBirth && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {calculateAge(patient.dateOfBirth)} years old
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <span className="ml-1 font-medium text-foreground capitalize">
                          {patient.type || 'human'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conditions:</span>
                        <span className="ml-1 font-medium text-foreground">
                          {patient.healthConditions?.length || 0}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab content: My Duties */}
        {activeTab === 'duties' && householdId && user && (
          <MyDutiesSection householdId={householdId} caregiverUserId={user.uid} />
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">About Caregiver Mode</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                You're viewing this as a caregiver for {caregiverContext.accountOwnerName}'s family.
                You can view and manage the assigned patients based on your permissions.
              </p>
              {!hasOwnAccount && (
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Want to track your own health or manage your own family?
                  <button
                    onClick={() => router.push('/onboarding')}
                    className="ml-1 underline font-medium hover:no-underline"
                  >
                    Create your own account
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
