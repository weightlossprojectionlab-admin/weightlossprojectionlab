'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { MedicationCard } from '@/components/health/MedicationCard'
import MedicationScanner from '@/components/health/MedicationScanner'
import { ScannedMedication } from '@/lib/medication-lookup'
import { medicalOperations } from '@/lib/medical-operations'
import { PatientProfile, PatientMedication } from '@/types/medical'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { PlusIcon, FunnelIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { Spinner } from '@/components/ui/Spinner'

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
  const [showMedicationScanner, setShowMedicationScanner] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState<string | undefined>(undefined)
  const [filterByPatient, setFilterByPatient] = useState<string | null>(null)
  const [filterByCondition, setFilterByCondition] = useState<string | null>(null)

  // Patient and medication state
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [medications, setMedications] = useState<PatientMedication[]>([])
  const [loading, setLoading] = useState(true)

  // Load patients on mount
  useEffect(() => {
    loadPatients()
  }, [])

  // Load medications when patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      loadMedications(selectedPatientId)
    }
  }, [selectedPatientId])

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

  // Handle scanned medication
  const handleMedicationScanned = async (scannedData: ScannedMedication) => {
    if (!selectedPatientId) {
      toast.error('No patient selected')
      return
    }

    try {
      await medicalOperations.medications.addMedication(selectedPatientId, {
        name: scannedData.name,
        brandName: scannedData.brandName,
        strength: scannedData.strength || 'Unknown',
        dosageForm: scannedData.dosageForm || 'Unknown',
        frequency: scannedData.frequency,
        prescribedFor: scannedData.prescribedFor,
        rxcui: scannedData.rxcui,
        ndc: scannedData.ndc,
        drugClass: scannedData.drugClass,
        rxNumber: scannedData.rxNumber,
        quantity: scannedData.quantity,
        refills: scannedData.refills,
        fillDate: scannedData.fillDate,
        expirationDate: scannedData.expirationDate,
        warnings: scannedData.warnings,
        pharmacyName: scannedData.pharmacyName,
        pharmacyPhone: scannedData.pharmacyPhone,
        scannedAt: new Date().toISOString()
      })

      toast.success(`${scannedData.name} added successfully`)
      setShowMedicationScanner(false)

      // Reload medications
      await loadMedications(selectedPatientId)
    } catch (error: any) {
      logger.error('[Medications Page] Error adding medication', error)
      toast.error(error.message || 'Failed to add medication')
    }
  }

  // Delete medication handler
  const handleDeleteMedication = async (medicationId: string, medicationName: string) => {
    if (!selectedPatientId) return

    if (!confirm(`Are you sure you want to delete ${medicationName}?`)) {
      return
    }

    try {
      await medicalOperations.medications.deleteMedication(selectedPatientId, medicationId)
      toast.success(`${medicationName} removed successfully`)

      // Reload medications
      await loadMedications(selectedPatientId)
    } catch (error) {
      logger.error('[Medications Page] Error deleting medication', error as Error)
      toast.error('Failed to delete medication')
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
            onClick={() => setShowMedicationScanner(true)}
            disabled={!selectedPatientId}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="w-5 h-5" />
            Add Medication
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
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
            <p className="text-muted-foreground mb-6">
              Start tracking medications for {selectedPatient?.name || 'this patient'}
            </p>
            <button
              onClick={() => setShowMedicationScanner(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              Add Your First Medication
            </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedications.map((med: PatientMedication) => (
                <MedicationCard
                  key={med.id}
                  medication={med}
                  onDelete={() => handleDeleteMedication(med.id, med.name)}
                  showActions={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Medication Scanner Modal */}
        <MedicationScanner
          isOpen={showMedicationScanner}
          onClose={() => setShowMedicationScanner(false)}
          onMedicationScanned={handleMedicationScanned}
          prescribedFor={selectedCondition}
        />
      </main>
    </div>
  )
}
