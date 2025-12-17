'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon, PencilIcon } from '@heroicons/react/24/outline'
import { ParsedMedicationData } from '@/lib/medication-parser'
import { uploadMedicationImage } from '@/lib/medication-image-upload'
import { medicalOperations } from '@/lib/medical-operations'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { PatientProfile } from '@/types/medical'

interface MedicationReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  patientId: string
  parsedData: ParsedMedicationData
  extractedText: string
  imageFile?: File
  imagePreview?: string
}

export function MedicationReviewModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  parsedData,
  extractedText,
  imageFile,
  imagePreview
}: MedicationReviewModalProps) {
  console.log('🔍 [MedicationReviewModal] patientId =', patientId)
  const { user } = useAuth()
  const [editedData, setEditedData] = useState<ParsedMedicationData>(parsedData)
  const [showRawText, setShowRawText] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Family member selection
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '')
  const [loadingPatients, setLoadingPatients] = useState(true)

  // Log when modal opens to debug patientId issues
  if (isOpen) {
    logger.info('[MedicationReviewModal] Modal opened', {
      patientId: patientId,
      patientIdType: typeof patientId,
      patientIdValue: JSON.stringify(patientId),
      patientIdLength: patientId?.length,
      hasUser: !!user,
      userId: user?.uid,
      medicationName: editedData.name
    })
  }

  // Load family members when modal opens
  useEffect(() => {
    if (!isOpen) return

    const loadPatients = async () => {
      try {
        setLoadingPatients(true)
        const fetchedPatients = await medicalOperations.patients.getPatients()
        setPatients(fetchedPatients)

        console.log('🔍 [MedicationReviewModal] Loaded patients, patientId from props:', patientId)
        console.log('🔍 [MedicationReviewModal] Fetched patients:', fetchedPatients.map(p => ({ id: p.id, name: p.name })))

        // IMPORTANT: The patientId prop is already set in state initialization
        // Just validate it exists in the fetched patients
        if (patientId && fetchedPatients.some(p => p.id === patientId)) {
          console.log('✅ [MedicationReviewModal] patientId is valid, keeping selection:', patientId)
          setSelectedPatientId(patientId) // Explicitly set it again to be safe
        } else if (fetchedPatients.length > 0) {
          console.log('⚠️ [MedicationReviewModal] patientId not found or empty, defaulting to first patient')
          setSelectedPatientId(fetchedPatients[0].id)
        }
      } catch (error) {
        logger.error('[MedicationReviewModal] Error loading patients', error as Error)
        toast.error('Failed to load family members')
      } finally {
        setLoadingPatients(false)
      }
    }

    loadPatients()
  }, [isOpen, patientId])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!user) {
      toast.error('You must be logged in')
      return
    }

    if (!selectedPatientId || selectedPatientId.trim() === '') {
      logger.error('[MedicationReviewModal] Invalid patient ID', {
        selectedPatientId
      })
      toast.error('Please select a family member')
      return
    }

    if (!editedData.name || !editedData.strength) {
      toast.error('Medication name and strength are required')
      return
    }

    setIsSaving(true)

    try {
      let imageUrl: string | undefined = undefined

      // Upload image to Firebase Storage if available
      if (imageFile) {
        try {
          logger.info('[MedicationReviewModal] Uploading medication image')
          imageUrl = await uploadMedicationImage(imageFile, user.uid, selectedPatientId)
          logger.info('[MedicationReviewModal] Image uploaded successfully', { imageUrl })
        } catch (uploadError) {
          logger.error('[MedicationReviewModal] Failed to upload image', uploadError as Error)
          toast.error('Failed to upload image, but will save medication anyway')
        }
      }

      // Save medication to Firestore
      logger.info('[MedicationReviewModal] Saving medication', {
        selectedPatientId,
        medicationName: editedData.name
      })

      await medicalOperations.medications.addMedication(selectedPatientId, {
        name: editedData.name,
        brandName: editedData.brandName,
        strength: editedData.strength,
        dosageForm: editedData.dosageForm || 'Unknown',
        frequency: editedData.frequency,
        prescribedFor: editedData.prescribedFor,
        prescribingDoctor: editedData.prescribingDoctor,
        rxNumber: editedData.rxNumber,
        ndc: editedData.ndc,
        quantity: editedData.quantity,
        refills: editedData.refills,
        fillDate: editedData.fillDate,
        expirationDate: editedData.expirationDate,
        pharmacyName: editedData.pharmacyName,
        pharmacyPhone: editedData.pharmacyPhone,
        warnings: editedData.warnings,
        imageUrl: imageUrl,
        extractedText: extractedText,
        scannedAt: new Date().toISOString()
      })

      toast.success(`${editedData.name} added successfully!`)
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('[MedicationReviewModal] Error saving medication', error as Error)
      toast.error('Failed to save medication')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Review Medication</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review the extracted information before saving
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Family Member Selection */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Assign to Family Member *
            </label>
            {loadingPatients ? (
              <div className="text-sm text-muted-foreground">Loading family members...</div>
            ) : (
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a family member</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.type === 'pet' ? '🐾 ' : '👤 '}
                    {patient.name}
                    {patient.relationship ? ` (${patient.relationship})` : ''}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Select which family member this medication belongs to
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Image Preview */}
            {imagePreview && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Scanned Label</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Medication label"
                    className="w-full h-auto object-contain bg-muted"
                  />
                </div>

                {/* Raw Text Toggle */}
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-sm text-primary hover:underline"
                >
                  {showRawText ? 'Hide' : 'Show'} extracted text
                </button>

                {showRawText && (
                  <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-foreground font-mono">
                      {extractedText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Right Column - Editable Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Medication Information</h3>

              {/* Medication Name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={editedData.name || ''}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Metformin"
                />
              </div>

              {/* Brand Name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={editedData.brandName || ''}
                  onChange={(e) => setEditedData({ ...editedData, brandName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Glucophage"
                />
              </div>

              {/* Strength & Dosage Form */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Strength *
                  </label>
                  <input
                    type="text"
                    value={editedData.strength || ''}
                    onChange={(e) => setEditedData({ ...editedData, strength: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., 500 mg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Form
                  </label>
                  <input
                    type="text"
                    value={editedData.dosageForm || ''}
                    onChange={(e) => setEditedData({ ...editedData, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., Tablet"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Dosage Instructions
                </label>
                <input
                  type="text"
                  value={editedData.frequency || ''}
                  onChange={(e) => setEditedData({ ...editedData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Take 1 tablet twice daily"
                />
              </div>

              {/* Prescribed For */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Prescribed For
                </label>
                <input
                  type="text"
                  value={editedData.prescribedFor || ''}
                  onChange={(e) => setEditedData({ ...editedData, prescribedFor: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Type 2 Diabetes"
                />
              </div>

              {/* Prescribing Doctor */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Prescribing Doctor
                </label>
                <input
                  type="text"
                  value={editedData.prescribingDoctor || ''}
                  onChange={(e) => setEditedData({ ...editedData, prescribingDoctor: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Dr. Smith"
                />
              </div>

              {/* RX Number & NDC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Rx Number
                  </label>
                  <input
                    type="text"
                    value={editedData.rxNumber || ''}
                    onChange={(e) => setEditedData({ ...editedData, rxNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    NDC
                  </label>
                  <input
                    type="text"
                    value={editedData.ndc || ''}
                    onChange={(e) => setEditedData({ ...editedData, ndc: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Quantity & Refills */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={editedData.quantity || ''}
                    onChange={(e) => setEditedData({ ...editedData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., 30 tablets"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Refills
                  </label>
                  <input
                    type="text"
                    value={editedData.refills || ''}
                    onChange={(e) => setEditedData({ ...editedData, refills: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., 3 refills"
                  />
                </div>
              </div>

              {/* Pharmacy Info */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Pharmacy
                </label>
                <input
                  type="text"
                  value={editedData.pharmacyName || ''}
                  onChange={(e) => setEditedData({ ...editedData, pharmacyName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., CVS Pharmacy"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Pharmacy Phone
                </label>
                <input
                  type="text"
                  value={editedData.pharmacyPhone || ''}
                  onChange={(e) => setEditedData({ ...editedData, pharmacyPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., (555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-between items-center gap-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <PencilIcon className="w-4 h-4 inline mr-1" />
            You can edit any field before saving
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!editedData.name || !editedData.strength || isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckIcon className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Medication'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
