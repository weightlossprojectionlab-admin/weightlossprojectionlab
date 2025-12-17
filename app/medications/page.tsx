'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { MedicationCard } from '@/components/health/MedicationCard'
import EditMedicationModal from '@/components/health/EditMedicationModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { medicalOperations } from '@/lib/medical-operations'
import { PatientProfile, PatientMedication } from '@/types/medical'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { PlusIcon, FunnelIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Spinner } from '@/components/ui/Spinner'
import { DocumentReader } from '@/components/medications/DocumentReader'

export default function MedicationsPage() {
  return (
    <AuthGuard>
      <MedicationsContent />
    </AuthGuard>
  )
}

function MedicationsContent() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [showDocumentReader, setShowDocumentReader] = useState(false)
  const [filterByCondition, setFilterByCondition] = useState<string | null>(null)

  // Patient and medication state
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [medications, setMedications] = useState<PatientMedication[]>([])
  const [loading, setLoading] = useState(true)

  // Delete confirmation state
  const [medicationToDelete, setMedicationToDelete] = useState<PatientMedication | null>(null)
  const [deletingMedicationId, setDeletingMedicationId] = useState<string | null>(null)

  // Load patients on mount
  useEffect(() => {
    loadPatients()
  }, [])

  // Load medications when patient is selected with real-time listener
  useEffect(() => {
    if (!selectedPatientId || !user) return

    logger.info('[Medications Page] Setting up real-time listener for medications', { selectedPatientId })

    // Set up real-time listener (using polling-based approach)
    const unsubscribe = medicalOperations.medications.listenToMedications(
      selectedPatientId,
      (updatedMedications) => {
        logger.info('[Medications Page] Medications updated from real-time listener', {
          count: updatedMedications.length
        })
        setMedications(updatedMedications)
        setLoading(false)
      },
      (error) => {
        logger.error('[Medications Page] Error in medications listener', error)
        toast.error('Failed to load medications')
        setLoading(false)
      }
    )

    // Cleanup listener on unmount or when patient changes
    return () => {
      logger.info('[Medications Page] Cleaning up medications listener')
      unsubscribe()
    }
  }, [selectedPatientId, user])

  const loadPatients = async () => {
    try {
      const data = await medicalOperations.patients.getPatients()
      setPatients(data)

      // Auto-select patient (priority: primary preference > self > first)
      if (data.length > 0) {
        let defaultPatient: PatientProfile | undefined

        // Priority 1: Use primaryPatientId from user preferences
        if (profile?.preferences?.primaryPatientId) {
          defaultPatient = data.find(p => p.id === profile.preferences.primaryPatientId)
        }

        // Priority 2: Fall back to "Self" patient
        if (!defaultPatient) {
          defaultPatient = data.find(p => p.relationship === 'self')
        }

        // Priority 3: Use first patient in list
        if (!defaultPatient) {
          defaultPatient = data[0]
        }

        if (defaultPatient) {
          setSelectedPatientId(defaultPatient.id)
        }
      }
    } catch (error) {
      logger.error('[Medications Page] Error loading patients', error as Error)
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const loadMedications = async (patientId: string) => {
    try {
      const data = await medicalOperations.medications.getMedications(patientId)
      setMedications(data)
    } catch (error) {
      logger.error('[Medications Page] Error loading medications', error as Error)
      toast.error('Failed to load medications')
    }
  }

  // Get unique conditions for filtering
  const uniqueConditions = useMemo(() => {
    const conditions = new Set<string>()
    medications.forEach((med: PatientMedication) => {
      if (med.prescribedFor) {
        conditions.add(med.prescribedFor)
      }
    })
    return Array.from(conditions).sort()
  }, [medications])

  // Filter medications by condition
  const filteredMedications = useMemo(() => {
    if (!filterByCondition) return medications
    return medications.filter(med => med.prescribedFor === filterByCondition)
  }, [medications, filterByCondition])

  // State for editing
  const [editingMedication, setEditingMedication] = useState<PatientMedication | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Edit medication handler
  const handleEditMedication = (medication: PatientMedication) => {
    setEditingMedication(medication)
    setShowEditModal(true)
  }

  // Save edited medication
  const handleSaveEdit = async (updates: Partial<PatientMedication>) => {
    if (!selectedPatientId || !editingMedication) return

    try {
      await medicalOperations.medications.updateMedication(
        selectedPatientId,
        editingMedication.id,
        updates
      )
      toast.success('Medication updated successfully')
      setShowEditModal(false)
      setEditingMedication(null)

      // Reload medications
      await loadMedications(selectedPatientId)
    } catch (error) {
      logger.error('[Medications Page] Error updating medication', error as Error)
      toast.error('Failed to update medication')
    }
  }

  // Delete medication handlers
  const handleDeleteClick = (medication: PatientMedication) => {
    setMedicationToDelete(medication)
  }

  const handleConfirmDelete = async () => {
    if (!medicationToDelete || !selectedPatientId) return

    try {
      setDeletingMedicationId(medicationToDelete.id)
      await medicalOperations.medications.deleteMedication(selectedPatientId, medicationToDelete.id)
      toast.success(`${medicationToDelete.name} removed successfully`)

      // Reload medications
      await loadMedications(selectedPatientId)
    } catch (error) {
      logger.error('[Medications Page] Error deleting medication', error as Error)
      toast.error('Failed to delete medication')
    } finally {
      setDeletingMedicationId(null)
      setMedicationToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Medication Management"
        subtitle={selectedPatient ? `Medications for ${selectedPatient.name}` : 'Track and manage medications'}
        actions={
          <button
            onClick={() => {
              if (!selectedPatientId) {
                toast.error('Please select a patient first')
                return
              }
              setShowDocumentReader(true)
            }}
            disabled={!selectedPatientId}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DocumentTextIcon className="w-5 h-5" />
            Scan Medication Label
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Family Member Selector */}
        {patients.length > 1 && (
          <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <UserGroupIcon className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Select Family Member</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {patients.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatientId(patient.id)
                    setFilterByCondition(null) // Clear condition filter when switching patients
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedPatientId === patient.id
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      selectedPatientId === patient.id
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${
                        selectedPatientId === patient.id ? 'text-primary' : 'text-foreground'
                      }`}>
                        {patient.name}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {patient.relationship || 'Family'}
                      </div>
                    </div>
                    {selectedPatientId === patient.id && (
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        {uniqueConditions.length > 0 && (
          <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Filter by Condition</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Filter by Condition */}
              <div className="flex items-center gap-2">
                <select
                  value={filterByCondition || ''}
                  onChange={(e) => setFilterByCondition(e.target.value || null)}
                  className="px-3 py-1.5 text-sm border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20 transition-colors"
                >
                  <option value="">All Conditions</option>
                  {uniqueConditions.map(condition => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {filterByCondition && (
                <button
                  onClick={() => setFilterByCondition(null)}
                  className="px-3 py-1.5 text-sm text-primary hover:text-primary-dark dark:text-purple-400 dark:hover:text-purple-300 font-medium underline"
                >
                  Clear Filter
                </button>
              )}
            </div>

            {/* Filter Results Summary */}
            <div className="mt-3 text-sm text-muted-foreground">
              Showing {filteredMedications.length} of {medications.length} medication{medications.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Medications Display */}
        {medications.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">💊</div>
            <p className="text-xl font-bold text-foreground mb-2">No Medications Yet</p>
            <p className="text-muted-foreground">
              Start tracking medications for {selectedPatient?.name || 'this patient'} by clicking "Scan Medication Label" above
            </p>
          </div>
        ) : filteredMedications.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl font-bold text-foreground mb-2">No Matching Medications</p>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filter to see more results
            </p>
            <button
              onClick={() => setFilterByCondition(null)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Clear Filter
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Current Medications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedications.map((med: PatientMedication) => (
                <MedicationCard
                  key={med.id}
                  medication={med}
                  onEdit={() => handleEditMedication(med)}
                  onDelete={() => handleDeleteClick(med)}
                  showActions={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Edit Medication Modal */}
        {showEditModal && editingMedication && selectedPatientId && (
          <EditMedicationModal
            medication={editingMedication}
            patientId={selectedPatientId}
            onClose={() => {
              setShowEditModal(false)
              setEditingMedication(null)
            }}
            onSave={handleSaveEdit}
          />
        )}

        {/* Document Reader Modal */}
        <DocumentReader
          isOpen={showDocumentReader && !!selectedPatientId}
          onClose={() => setShowDocumentReader(false)}
          onSuccess={() => {
            logger.info('[Medications Page] Medication saved successfully from review modal')
            setShowDocumentReader(false)
          }}
          patientId={selectedPatientId || ''}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!medicationToDelete}
          onClose={() => setMedicationToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Medication Record"
          message={`Are you sure you want to delete ${medicationToDelete?.name}?\n\n⚠️ This is a MEDICAL RECORD and this action cannot be undone.\n\nThe deletion will be logged for accountability and compliance purposes.`}
          confirmText="Delete Medication"
          cancelText="Cancel"
          variant="danger"
          iconSize="large"
          customIcon={
            <div className="relative">
              {/* Medical cross background */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-12 h-12 text-error opacity-20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                </svg>
              </div>
              {/* Pill icon */}
              <svg className="w-14 h-14 text-error relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.22 11.29l7.07-7.07c.78-.78 2.05-.78 2.83 0l4.95 4.95c.78.78.78 2.05 0 2.83l-7.07 7.07c-.78.78-2.05.78-2.83 0L4.22 14.12c-.78-.78-.78-2.05 0-2.83zM5.64 12.7l4.95 4.95 7.07-7.07-4.95-4.95-7.07 7.07zm9.55-3.03V7.45h-1.41v2.22h-2.23v1.41h2.23v2.23h1.41v-2.23h2.22V9.67h-2.22z"/>
              </svg>
              {/* Warning badge */}
              <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          }
        />
      </main>
    </div>
  )
}
