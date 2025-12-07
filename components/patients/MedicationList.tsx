'use client'

import { useState, useEffect } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { PatientMedication } from '@/types/medical'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import ConfirmModal from '@/components/ui/ConfirmModal'
import MedicationDetailModal from '@/components/health/MedicationDetailModal'

interface MedicationListProps {
  patientId: string
  patientOwnerId?: string
  medications: PatientMedication[]
  loading: boolean
  onMedicationUpdated: () => void
}

export function MedicationList({ patientId, patientOwnerId, medications, loading, onMedicationUpdated }: MedicationListProps) {
  const [deletingMedicationId, setDeletingMedicationId] = useState<string | null>(null)
  const [medicationToDelete, setMedicationToDelete] = useState<PatientMedication | null>(null)
  const [loggingDoseId, setLoggingDoseId] = useState<string | null>(null)
  const [selectedMedication, setSelectedMedication] = useState<PatientMedication | null>(null)
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<PatientMedication>>({})

  const handleDeleteClick = (medication: PatientMedication) => {
    setMedicationToDelete(medication)
  }

  const handleConfirmDelete = async () => {
    if (!medicationToDelete) return

    try {
      setDeletingMedicationId(medicationToDelete.id)
      await medicalOperations.medications.deleteMedication(patientId, medicationToDelete.id)
      toast.success('Medication deleted')
      onMedicationUpdated() // Refresh the parent's medication list
    } catch (error: any) {
      logger.error('[MedicationList] Error deleting medication', error)
      toast.error('Failed to delete medication')
    } finally {
      setDeletingMedicationId(null)
      setMedicationToDelete(null)
    }
  }

  const handleMarkAsTaken = async (medication: PatientMedication) => {
    try {
      setLoggingDoseId(medication.id)
      await medicalOperations.medications.logDose(patientId, medication.id, {
        takenAt: new Date().toISOString()
      })
      toast.success(`${medication.name} marked as taken`)
      onMedicationUpdated() // Refresh the parent's medication list
    } catch (error: any) {
      logger.error('[MedicationList] Error logging dose', error)
      toast.error('Failed to log medication dose')
    } finally {
      setLoggingDoseId(null)
    }
  }

  const handleEditClick = (medication: PatientMedication, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingMedicationId(medication.id)
    setEditForm({
      name: medication.name,
      brandName: medication.brandName,
      strength: medication.strength,
      dosageForm: medication.dosageForm,
      frequency: medication.frequency,
      prescribedFor: medication.prescribedFor,
      prescribingDoctor: medication.prescribingDoctor,
      rxNumber: medication.rxNumber,
      quantity: medication.quantity,
      refills: medication.refills,
      notes: medication.notes
    })
  }

  const handleCancelEdit = () => {
    setEditingMedicationId(null)
    setEditForm({})
  }

  const handleSaveEdit = async (medicationId: string) => {
    try {
      await medicalOperations.medications.updateMedication(patientId, medicationId, editForm)
      toast.success('Medication updated successfully')
      setEditingMedicationId(null)
      setEditForm({})
      onMedicationUpdated() // Refresh the parent's medication list
    } catch (error: any) {
      logger.error('[MedicationList] Error updating medication', error)
      toast.error('Failed to update medication')
    }
  }

  // Calculate if refill is needed
  const getRefillStatus = (medication: PatientMedication) => {
    if (!medication.quantityRemaining || !medication.quantity) return null

    const remaining = medication.quantityRemaining
    const total = parseInt(medication.quantity) || 0

    if (remaining <= 0) {
      return { status: 'empty', message: 'Out of medication', color: 'text-error' }
    } else if (remaining <= 7) {
      return { status: 'low', message: `Only ${remaining} doses left`, color: 'text-amber-600 dark:text-amber-400' }
    } else if (remaining <= 14) {
      return { status: 'moderate', message: `${remaining} doses remaining`, color: 'text-blue-600 dark:text-blue-400' }
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (medications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No medications added yet</p>
        <p className="text-sm mt-2">Add medications using the form above</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {medications.map((med) => {
        const refillStatus = getRefillStatus(med)
        const isEditing = editingMedicationId === med.id

        return (
          <div
            key={med.id}
            className="bg-background rounded-lg p-4 border-2 border-border hover:border-primary/30 transition-colors"
            onClick={() => !isEditing && setSelectedMedication(med)}
          >
            {isEditing ? (
              // Edit Mode
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Edit Medication</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="text-sm px-3 py-1 text-muted-foreground hover:text-foreground border border-border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(med.id)}
                      className="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary-hover"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Medication Name</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Brand Name</label>
                    <input
                      type="text"
                      value={editForm.brandName || ''}
                      onChange={(e) => setEditForm({...editForm, brandName: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Strength</label>
                    <input
                      type="text"
                      value={editForm.strength || ''}
                      onChange={(e) => setEditForm({...editForm, strength: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Dosage Form</label>
                    <input
                      type="text"
                      value={editForm.dosageForm || ''}
                      onChange={(e) => setEditForm({...editForm, dosageForm: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">Frequency</label>
                    <input
                      type="text"
                      value={editForm.frequency || ''}
                      onChange={(e) => setEditForm({...editForm, frequency: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Prescribed For</label>
                    <input
                      type="text"
                      value={editForm.prescribedFor || ''}
                      onChange={(e) => setEditForm({...editForm, prescribedFor: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Prescribing Doctor</label>
                    <input
                      type="text"
                      value={editForm.prescribingDoctor || ''}
                      onChange={(e) => setEditForm({...editForm, prescribingDoctor: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Rx Number</label>
                    <input
                      type="text"
                      value={editForm.rxNumber || ''}
                      onChange={(e) => setEditForm({...editForm, rxNumber: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Quantity</label>
                    <input
                      type="text"
                      value={editForm.quantity || ''}
                      onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Refills</label>
                    <input
                      type="text"
                      value={editForm.refills || ''}
                      onChange={(e) => setEditForm({...editForm, refills: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">Notes</label>
                    <textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {med.name}
                      {med.brandName && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({med.brandName})
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {med.strength} • {med.dosageForm}
                    </p>
                    {refillStatus && (
                      <p className={`text-xs font-medium mt-1 ${refillStatus.color}`}>
                        {refillStatus.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleEditClick(med, e)}
                      className="text-primary hover:text-primary-dark text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(med)
                      }}
                      disabled={deletingMedicationId === med.id}
                      className="text-error hover:text-error-dark text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingMedicationId === med.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

          {med.frequency && (
            <div className="mt-2 p-2 bg-primary-light/50 rounded text-sm">
              <span className="font-medium">Dosage:</span> {med.frequency}
            </div>
          )}

          {med.prescribedFor && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium">For:</span> {med.prescribedFor}
            </p>
          )}

          {med.rxNumber && (
            <p className="text-xs text-muted-foreground mt-2">
              Rx #{med.rxNumber}
            </p>
          )}

          {med.warnings && med.warnings.length > 0 && (
            <div className="mt-2 p-2 bg-warning-light/20 rounded text-xs text-warning-dark">
              <span className="font-medium">⚠️ Warnings:</span>
              <ul className="list-disc list-inside mt-1">
                {med.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {med.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {med.notes}
            </p>
          )}

          {/* Adherence tracking */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {med.lastTaken && (
                  <p className="text-xs text-muted-foreground">
                    Last taken: {new Date(med.lastTaken).toLocaleString()}
                  </p>
                )}
                {med.adherenceRate !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Adherence: {med.adherenceRate.toFixed(0)}%
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkAsTaken(med)
                }}
                disabled={loggingDoseId === med.id}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loggingDoseId === med.id ? 'Logging...' : 'Mark as Taken'}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Added {new Date(med.addedAt).toLocaleDateString()}
          </p>
              </>
            )}
          </div>
        )
      })}

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

      {/* Medication Detail Modal */}
      {selectedMedication && (
        <MedicationDetailModal
          medication={selectedMedication}
          onClose={() => setSelectedMedication(null)}
          patientId={patientId}
        />
      )}
    </div>
  )
}
