'use client'

/**
 * Patient Household Duties Page
 *
 * Manage household duties for a specific patient
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { PatientProfile } from '@/types/medical'
import { CaregiverProfile } from '@/types/caregiver'
import { Household } from '@/types/household'
import { DutyListView } from '@/components/household/DutyListView'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import AuthGuard from '@/components/auth/AuthGuard'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

import { getCSRFToken } from '@/lib/csrf'
export default function PatientDutiesPage() {
  return (
    <AuthGuard>
      <PatientDutiesContent />
    </AuthGuard>
  )
}

function PatientDutiesContent() {
  const params = useParams()
  const patientId = params.patientId as string

  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [patientId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      // Fetch patient
      const patientResponse = await fetch(`/api/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!patientResponse.ok) {
        throw new Error('Failed to fetch patient')
      }

      const patientData = await patientResponse.json()
      setPatient(patientData)

      // Fetch household that contains this patient
      const householdsQuery = query(
        collection(db, 'households'),
        where('memberIds', 'array-contains', patientId),
        where('isActive', '==', true)
      )

      const householdsSnapshot = await getDocs(householdsQuery)
      if (!householdsSnapshot.empty) {
        const householdData = {
          id: householdsSnapshot.docs[0].id,
          ...householdsSnapshot.docs[0].data()
        } as Household
        setHousehold(householdData)
      }

      // Fetch caregivers for this patient
      const caregiversResponse = await fetch(`/api/family/caregivers?patientId=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (caregiversResponse.ok) {
        const caregiversData = await caregiversResponse.json()
        setCaregivers(caregiversData.caregivers || [])
      }
    } catch (error) {
      logger.error('[PatientDutiesPage] Error fetching data', error as Error)
      toast.error('Failed to load patient data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">Patient Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The patient you're looking for doesn't exist or you don't have access.
            </p>
            <Link
              href="/patients"
              className="text-primary hover:underline"
            >
              ← Back to Patients
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/patients/${patientId}`}
            className="inline-flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to {patient.name}'s Profile
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Household Duties</h1>
              <p className="text-muted-foreground mt-1">
                Manage household tasks and responsibilities for {patient.name}
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Household Duty Management
              </h3>
              <p className="text-sm text-blue-800">
                Assign household duties like laundry, cleaning, shopping, and meal preparation to caregivers.
                Track completion, set schedules, and get reminders for overdue tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Household Check */}
        {!household ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                  No Household Found
                </h3>
                <p className="text-sm text-yellow-800 mb-2">
                  This patient needs to be added to a household before you can manage household duties.
                </p>
                <Link
                  href="/family-admin/households"
                  className="text-sm text-yellow-900 underline font-medium hover:text-yellow-800"
                >
                  Create Household →
                </Link>
              </div>
            </div>
          </div>
        ) : caregivers.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                  No Caregivers Assigned
                </h3>
                <p className="text-sm text-yellow-800 mb-2">
                  You need to add caregivers before you can assign household duties.
                </p>
                <Link
                  href="/family"
                  className="text-sm text-yellow-900 underline font-medium hover:text-yellow-800"
                >
                  Add Caregivers →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <DutyListView
            householdId={household.id}
            householdName={household.name}
            forPatientId={patientId}
            forPatientName={patient.name}
            caregivers={caregivers}
          />
        )}
      </div>
    </div>
  )
}
