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
import type { CaregiverContext } from '@/types'
import type { PatientProfile } from '@/types/medical'

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

function CaregiverDashboardContent({ params }: CaregiverDashboardPageProps) {
  const resolvedParams = use(params)
  const { accountOwnerId } = resolvedParams
  const { user } = useAuth()
  const router = useRouter()

  const [caregiverContext, setCaregiverContext] = useState<CaregiverContext | null>(null)
  const [patients, setPatients] = useState<PatientProfile[]>([])
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

        // Fetch assigned patients from the account owner's patients collection
        const patientsSnapshot = await getDocs(
          collection(db, 'users', accountOwnerId, 'patients')
        )

        const allPatients: PatientProfile[] = []
        patientsSnapshot.forEach((doc) => {
          const patientData = doc.data() as PatientProfile
          // Only include patients this caregiver has access to
          if (context.patientsAccess.includes(doc.id)) {
            allPatients.push({ ...patientData, id: doc.id })
          }
        })

        setPatients(allPatients)
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

        {/* Assigned Patients */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Assigned Patients</h2>
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
