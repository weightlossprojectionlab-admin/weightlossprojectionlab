/**
 * Patient Detail Page with Vitals Tracking
 * Displays patient information and allows logging/viewing vital signs
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { medicalOperations } from '@/lib/medical-operations'
import { useVitals } from '@/hooks/useVitals'
import { PatientProfile, VitalType } from '@/types/medical'
import { VitalLogForm } from '@/components/vitals/VitalLogForm'
import { VitalTrendChart } from '@/components/vitals/VitalTrendChart'
import { PageHeader } from '@/components/ui/PageHeader'
import { ChartBarIcon, PlusIcon } from '@heroicons/react/24/outline'
import AuthGuard from '@/components/auth/AuthGuard'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

export default function PatientDetailPage() {
  return (
    <AuthGuard>
      <PatientDetailContent />
    </AuthGuard>
  )
}

function PatientDetailContent() {
  const params = useParams()
  const patientId = params.patientId as string

  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogForm, setShowLogForm] = useState(false)
  const [selectedVitalType, setSelectedVitalType] = useState<VitalType>('blood_pressure')
  const [familyMemberCount, setFamilyMemberCount] = useState(0)

  const { vitals, loading: vitalsLoading, logVital, refetch } = useVitals({
    patientId,
    autoFetch: true
  })

  // Fetch patient details
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true)
        const data = await medicalOperations.patients.getPatient(patientId)
        setPatient(data)
      } catch (error: any) {
        logger.error('[PatientDetail] Error fetching patient', error)
        toast.error('Failed to load family member details')
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [patientId])

  // Fetch family member count
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const members = await medicalOperations.family.getFamilyMembers(patientId)
        setFamilyMemberCount(members.length)
      } catch (error: any) {
        logger.error('[PatientDetail] Error fetching family members count', error)
      }
    }

    fetchFamilyMembers()
  }, [patientId])

  const handleLogVital = async (data: any) => {
    try {
      await logVital(data)
      setShowLogForm(false)
      toast.success('Vital sign logged successfully')
      refetch()
    } catch (error: any) {
      // Error toast already shown in logVital
      logger.error('[PatientDetail] Error in handleLogVital', error)
    }
  }

  const vitalTypes: VitalType[] = [
    'blood_pressure',
    'blood_sugar',
    'heart_rate',
    'blood_oxygen',
    'temperature',
    'weight'
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Family member not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title={patient.name}
        subtitle={`${patient.type} • ${patient.relationship}`}
        backHref="/patients"
        actions={
          <button
            onClick={() => setShowLogForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Log Vital
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient Info */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                Family Member Information
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="ml-2 font-medium capitalize">{patient.type}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Relationship:</span>
                  <span className="ml-2 font-medium capitalize">{patient.relationship}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Date of Birth:</span>
                  <span className="ml-2 font-medium">
                    {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
                {patient.gender && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Gender:</span>
                    <span className="ml-2 font-medium capitalize">{patient.gender}</span>
                  </div>
                )}
                {patient.species && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Species:</span>
                    <span className="ml-2 font-medium">{patient.species}</span>
                  </div>
                )}
                {patient.breed && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Breed:</span>
                    <span className="ml-2 font-medium">{patient.breed}</span>
                  </div>
                )}
              </div>

              {/* Family Access */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Family Access
                </h3>
                <button
                  onClick={() => window.location.href = `/patients/${patientId}/family`}
                  className="w-full px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-sm font-medium"
                >
                  {familyMemberCount === 0
                    ? 'Manage Family Access'
                    : `${familyMemberCount} Family Member${familyMemberCount > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>

            {/* Log Vital Form */}
            {showLogForm && (
              <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Log Vital Sign
                </h2>
                <VitalLogForm
                  patientId={patientId}
                  onSubmit={handleLogVital}
                  onCancel={() => setShowLogForm(false)}
                />
              </div>
            )}
          </div>

          {/* Right Column - Vitals */}
          <div className="lg:col-span-2">
            {/* Vital Type Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {vitalTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedVitalType(type)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedVitalType === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {selectedVitalType.replace('_', ' ')} Trend
                </h2>
              </div>
              {vitalsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <VitalTrendChart vitals={vitals} type={selectedVitalType} />
              )}
            </div>

            {/* Recent Readings */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                Recent Readings
              </h2>
              <div className="space-y-3">
                {vitals
                  .filter(v => v.type === selectedVitalType)
                  .slice(0, 5)
                  .map(vital => (
                    <div
                      key={vital.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {typeof vital.value === 'object'
                            ? `${vital.value.systolic}/${vital.value.diastolic}`
                            : vital.value}{' '}
                          {vital.unit}
                        </p>
                        {vital.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {vital.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(vital.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                {vitals.filter(v => v.type === selectedVitalType).length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No readings yet for this vital type
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
