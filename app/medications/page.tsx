'use client'

import { useState, useMemo } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { MedicationCard } from '@/components/health/MedicationCard'
import { MedicationManagementModal } from '@/components/health/MedicationManagementModal'
import { ScannedMedication } from '@/lib/medication-lookup'
import { userProfileOperations } from '@/lib/firebase-operations'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { PlusIcon, FunnelIcon, UserGroupIcon } from '@heroicons/react/24/outline'

export default function MedicationsPage() {
  return (
    <AuthGuard>
      <MedicationsContent />
    </AuthGuard>
  )
}

function MedicationsContent() {
  const { user } = useAuth()
  const { profile, refetch: refetchProfile } = useUserProfile()
  const [showMedicationModal, setShowMedicationModal] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState<string | undefined>(undefined)
  const [filterByPatient, setFilterByPatient] = useState<string | null>(null)
  const [filterByCondition, setFilterByCondition] = useState<string | null>(null)
  const [editingMedication, setEditingMedication] = useState<ScannedMedication | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const medications = profile?.profile?.medications || []

  // Get unique patient names and conditions for filtering
  const uniquePatients = useMemo(() => {
    const patients = new Set<string>()
    medications.forEach(med => {
      if (med.patientName) {
        patients.add(med.patientName)
      }
    })
    return Array.from(patients).sort()
  }, [medications])

  const uniqueConditions = useMemo(() => {
    const conditions = new Set<string>()
    medications.forEach(med => {
      if (med.prescribedFor) {
        conditions.add(med.prescribedFor)
      }
    })
    return Array.from(conditions).sort()
  }, [medications])

  // Filter medications
  const filteredMedications = useMemo(() => {
    let filtered = [...medications]

    if (filterByPatient) {
      filtered = filtered.filter(med => med.patientName === filterByPatient)
    }

    if (filterByCondition) {
      filtered = filtered.filter(med => med.prescribedFor === filterByCondition)
    }

    return filtered
  }, [medications, filterByPatient, filterByCondition])

  // Group medications by patient
  const medicationsByPatient = useMemo(() => {
    const grouped = new Map<string, ScannedMedication[]>()

    filteredMedications.forEach(med => {
      const patient = med.patientName || 'Unassigned'
      if (!grouped.has(patient)) {
        grouped.set(patient, [])
      }
      grouped.get(patient)!.push(med)
    })

    return grouped
  }, [filteredMedications])

  // Save medications handler
  const handleSaveMedications = async (medications: ScannedMedication[]) => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      logger.debug('[Medications Page] Saving medications', { count: medications.length })

      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile: {
            medications
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        logger.error('[Medications Page] Failed to save medications', new Error(errorData.error || 'Unknown error'))
        throw new Error(errorData.error || 'Failed to update medications')
      }

      // Refetch profile to get updated medications
      const responseData = await response.json()
      if (responseData.success) {
        await refetchProfile()
        logger.debug('[Medications Page] Profile refetched with new medications')
      }
    } catch (error) {
      logger.error('[Medications Page] Error in handleSaveMedications', error as Error)
      throw error
    }
  }

  // Delete medication handler
  const handleDeleteMedication = async (index: number) => {
    if (!user) return

    const medicationName = medications[index]?.name
    if (!confirm(`Are you sure you want to delete ${medicationName}?`)) {
      return
    }

    try {
      const updatedMedications = medications.filter((_, i) => i !== index)
      await handleSaveMedications(updatedMedications)
      toast.success(`${medicationName} removed successfully`)
    } catch (error) {
      logger.error('[Medications Page] Error deleting medication', error as Error)
      toast.error('Failed to delete medication')
    }
  }

  // Edit medication handler
  const handleEditMedication = (index: number) => {
    const med = medications[index]
    if (med) {
      setEditingMedication(med)
      setEditingIndex(index)
      setShowMedicationModal(true)
    }
  }

  // Save edited medication
  const handleSaveEdit = async (updatedMedications: ScannedMedication[]) => {
    if (editingIndex !== null && editingMedication) {
      // Replace the medication at editingIndex with the updated one
      const allMedications = [...medications]
      // Find the updated medication in the list (it should be the last one if newly scanned)
      const newMed = updatedMedications[updatedMedications.length - 1]
      if (newMed) {
        allMedications[editingIndex] = newMed
        await handleSaveMedications(allMedications)
        toast.success(`${newMed.name} updated successfully`)
      }
    } else {
      // Regular add flow
      await handleSaveMedications(updatedMedications)
    }
    setEditingMedication(null)
    setEditingIndex(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Medication Management"
        subtitle="Track and manage medications for you and your family"
        actions={
          <button
            onClick={() => {
              setSelectedCondition(undefined)
              setShowMedicationModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Add Medication
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Filter Bar */}
        {(uniquePatients.length > 0 || uniqueConditions.length > 0) && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filter Medications</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Filter by Patient */}
              {uniquePatients.length > 0 && (
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterByPatient || ''}
                    onChange={(e) => setFilterByPatient(e.target.value || null)}
                    className="px-3 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-colors"
                  >
                    <option value="">All Patients</option>
                    {uniquePatients.map(patient => (
                      <option key={patient} value={patient}>
                        {patient}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filter by Condition */}
              {uniqueConditions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Condition:</span>
                  <select
                    value={filterByCondition || ''}
                    onChange={(e) => setFilterByCondition(e.target.value || null)}
                    className="px-3 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-colors"
                  >
                    <option value="">All Conditions</option>
                    {uniqueConditions.map(condition => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear Filters */}
              {(filterByPatient || filterByCondition) && (
                <button
                  onClick={() => {
                    setFilterByPatient(null)
                    setFilterByCondition(null)
                  }}
                  className="px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Filter Results Summary */}
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredMedications.length} of {medications.length} medication{medications.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Medications Grouped by Patient */}
        {medications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">💊</div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Medications Yet</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start tracking medications for you and your family members
            </p>
            <button
              onClick={() => setShowMedicationModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              Add Your First Medication
            </button>
          </div>
        ) : filteredMedications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Matching Medications</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try adjusting your filters to see more results
            </p>
            <button
              onClick={() => {
                setFilterByPatient(null)
                setFilterByCondition(null)
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(medicationsByPatient.entries()).map(([patient, meds]) => (
              <div key={patient} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
                {/* Patient Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <UserGroupIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {patient}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {meds.length} medication{meds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {patient !== 'Unassigned' && (
                    <button
                      onClick={() => setFilterByPatient(patient)}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                    >
                      View Only
                    </button>
                  )}
                </div>

                {/* Medication Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {meds.map((med) => {
                    // Find the global index of this medication in the full medications array
                    const globalIndex = medications.findIndex(m =>
                      m.name === med.name &&
                      m.scannedAt === med.scannedAt &&
                      m.patientName === med.patientName
                    )
                    return (
                      <MedicationCard
                        key={globalIndex}
                        medication={med}
                        onEdit={() => handleEditMedication(globalIndex)}
                        onDelete={() => handleDeleteMedication(globalIndex)}
                        showActions={true}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Medication Management Modal */}
        {profile?.profile && (
          <MedicationManagementModal
            isOpen={showMedicationModal}
            onClose={() => {
              setShowMedicationModal(false)
              setSelectedCondition(undefined)
              setEditingMedication(null)
              setEditingIndex(null)
            }}
            medications={medications}
            onSave={editingIndex !== null ? handleSaveEdit : handleSaveMedications}
            prescribedFor={selectedCondition}
          />
        )}
      </main>
    </div>
  )
}
