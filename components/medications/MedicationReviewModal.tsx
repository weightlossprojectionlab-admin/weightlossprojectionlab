'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon, PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ParsedMedicationData } from '@/lib/medication-parser'
import { uploadMedicationImage, uploadMedicationImageRecord } from '@/lib/medication-image-upload'
import { medicalOperations } from '@/lib/medical-operations'
import { useAuth } from '@/hooks/useAuth'
import { getPatientBadgeLabel } from '@/lib/life-stage-utils'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { PatientProfile, MedicationImage } from '@/types/medical'

/**
 * Normalize a patient name for matching. Handles:
 *   - case differences ("JANE DOE" → "jane doe")
 *   - title prefixes ("Dr. Jane Doe" → "jane doe")
 *   - inverted comma form ("Doe, Jane" → "jane doe")
 *   - collapsed whitespace
 * Used both to normalize OCR-extracted names and household-patient
 * names before equality comparison.
 */
function normalizePatientName(raw: string | null | undefined): string {
  if (!raw) return ''
  let s = raw.trim()
  // Strip common honorifics so "Dr. Jane Doe" matches "Jane Doe".
  s = s.replace(/^(Mr|Mrs|Ms|Dr|Miss|Sir|Madam)\.?\s+/i, '')
  // Convert "Last, First [Middle]" → "First [Middle] Last". Pharmacy
  // info sheets often use the inverted form on the banner.
  const commaMatch = s.match(/^([^,]+),\s*(.+)$/)
  if (commaMatch) {
    s = `${commaMatch[2]} ${commaMatch[1]}`
  }
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Find the household patient that matches an OCR-extracted patient
 * name. Tries the patient's full `name` field first, then a derived
 * `firstName + lastName` (in case the patient was created with parts
 * but the concatenated form drifted). Returns null when no patient
 * matches — caller falls back to the legacy patientId-prop default.
 */
function findPatientByOcrName(
  patients: PatientProfile[],
  ocrName: string | null | undefined,
): PatientProfile | null {
  const normalized = normalizePatientName(ocrName)
  if (!normalized) return null

  for (const p of patients) {
    if (normalizePatientName(p.name) === normalized) return p
  }
  for (const p of patients) {
    const parts = [p.firstName, p.lastName].filter(Boolean).join(' ')
    if (parts && normalizePatientName(parts) === normalized) return p
  }
  return null
}

interface MedicationReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  patientId: string
  parsedData: ParsedMedicationData
  extractedText: string
  // Legacy single-image props (used by DocumentReader re-OCR flow)
  imageFile?: File
  imagePreview?: string
  // Paired-image props (used by MedicationLabelCapture two-photo flow)
  imageFiles?: { front?: File; back?: File }
  imagePreviews?: { front?: string; back?: string }
}

export function MedicationReviewModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  parsedData,
  extractedText,
  imageFile,
  imagePreview,
  imageFiles,
  imagePreviews
}: MedicationReviewModalProps) {
  const { user } = useAuth()
  const [editedData, setEditedData] = useState<ParsedMedicationData>(parsedData)
  const [showRawText, setShowRawText] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Family member selection
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '')
  const [loadingPatients, setLoadingPatients] = useState(true)
  // True when the current selectedPatientId was auto-picked by
  // matching the OCR-extracted patientName against the household.
  // Clears to false the moment the user manually changes the dropdown
  // (so the "matched from label" hint is honest about what the user
  // is currently looking at, not stuck on a stale match).
  const [matchedFromOCR, setMatchedFromOCR] = useState(false)
  // Holds the OCR-extracted patient name when the label clearly names
  // someone but that person is NOT in the household. We surface it as
  // an amber warning AND refuse to pre-select anyone — silently
  // defaulting to the account holder would risk saving this person's
  // medication onto the wrong patient's record (a do-no-harm
  // violation). Cleared once the user makes a conscious selection.
  const [unmatchedOcrName, setUnmatchedOcrName] = useState<string | null>(null)

  // Log on open transition only, not every render. The previous
  // body-level `if (isOpen) logger.info(...)` fired on every parent
  // re-render (e.g. each useMedications polling tick) and produced
  // dozens of "Modal opened" entries per minute. Gating in a useEffect
  // keyed on isOpen reduces it to one log per open.
  useEffect(() => {
    if (!isOpen) return
    logger.info('[MedicationReviewModal] Modal opened', {
      patientId: patientId,
      patientIdLength: patientId?.length,
      hasUser: !!user,
      userId: user?.uid,
      medicationName: editedData.name,
    })
  }, [isOpen, patientId, user, editedData.name])

  // Load family members when modal opens
  useEffect(() => {
    if (!isOpen) return

    const loadPatients = async () => {
      try {
        setLoadingPatients(true)
        const fetchedPatients = await medicalOperations.patients.getPatients()
        setPatients(fetchedPatients)

        // Selection priority:
        //   1. OCR-extracted patientName matches a household patient
        //      → use that match (the prescription label literally
        //      names who the medication is for; that's the strongest
        //      signal we have). Sets matchedFromOCR so the UI can
        //      surface a "Matched from prescription label" hint.
        //   2. OCR named someone, but they're NOT in the household
        //      → select NOBODY and warn. Falling back to the account
        //      holder here would silently assign this person's
        //      medication to the wrong patient. Force a conscious pick.
        //   3. No usable OCR name → patientId prop if valid (the
        //      parent's currently-viewed family member is the legacy
        //      default), else the first patient in the household.
        const ocrMatch = findPatientByOcrName(fetchedPatients, parsedData.patientName)
        const normalizedOcrName = normalizePatientName(parsedData.patientName)
        if (ocrMatch) {
          setSelectedPatientId(ocrMatch.id)
          setMatchedFromOCR(true)
          setUnmatchedOcrName(null)
          logger.info('[MedicationReviewModal] Auto-matched patient from OCR', {
            ocrName: parsedData.patientName,
            matchedPatientId: ocrMatch.id,
          })
        } else if (normalizedOcrName) {
          // Label names a person not in the family. Do NOT pre-select.
          setSelectedPatientId('')
          setMatchedFromOCR(false)
          setUnmatchedOcrName(parsedData.patientName ?? null)
          logger.info('[MedicationReviewModal] OCR patient name has no household match', {
            ocrName: parsedData.patientName,
          })
        } else if (patientId && fetchedPatients.some(p => p.id === patientId)) {
          setSelectedPatientId(patientId)
          setMatchedFromOCR(false)
          setUnmatchedOcrName(null)
        } else if (fetchedPatients.length > 0) {
          setSelectedPatientId(fetchedPatients[0].id)
          setMatchedFromOCR(false)
          setUnmatchedOcrName(null)
        }
      } catch (error) {
        logger.error('[MedicationReviewModal] Error loading patients', error as Error)
        toast.error('Failed to load family members')
      } finally {
        setLoadingPatients(false)
      }
    }

    loadPatients()
  }, [isOpen, patientId, parsedData.patientName])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!user) {
      toast.error('You must be logged in')
      return
    }

    if (!selectedPatientId || selectedPatientId.trim() === '') {
      logger.error('[MedicationReviewModal] Invalid patient ID', undefined, {
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
      const usingPairedFlow = !!(imageFiles?.front || imageFiles?.back)

      if (usingPairedFlow) {
        // Two-photo flow: create medication first (we need its id for the storage path),
        // then upload both images, then update the medication with the populated images array.
        logger.info('[MedicationReviewModal] Saving medication (paired-image flow)', {
          selectedPatientId,
          medicationName: editedData.name,
          hasFront: !!imageFiles?.front,
          hasBack: !!imageFiles?.back
        })

        const created = await medicalOperations.medications.addMedication(selectedPatientId, {
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
          extractedText: extractedText,
          images: [],
          scannedAt: new Date().toISOString()
        })

        const uploaded: MedicationImage[] = []
        try {
          if (imageFiles?.front) {
            const front = await uploadMedicationImageRecord(
              imageFiles.front,
              user.uid,
              selectedPatientId,
              created.id,
              'front',
              true
            )
            front.ocrProcessed = true
            front.ocrExtractedText = extractedText || undefined
            front.ocrConfidence = 95
            uploaded.push(front)
          }
          if (imageFiles?.back) {
            const back = await uploadMedicationImageRecord(
              imageFiles.back,
              user.uid,
              selectedPatientId,
              created.id,
              'back',
              !imageFiles.front // back becomes primary only if no front was provided
            )
            back.ocrProcessed = true
            back.ocrConfidence = 95
            uploaded.push(back)
          }
        } catch (uploadError) {
          logger.error('[MedicationReviewModal] Image upload failed (paired flow)', uploadError as Error)
          toast.error('Saved medication, but image upload failed.')
        }

        if (uploaded.length > 0) {
          try {
            const primary = uploaded.find(img => img.isPrimary) || uploaded[0]
            await medicalOperations.medications.updateMedication(selectedPatientId, created.id, {
              images: uploaded,
              imageUrl: primary.url
            })
          } catch (updateError) {
            logger.error('[MedicationReviewModal] Failed to attach images to medication', updateError as Error)
            toast.error('Saved medication, but failed to attach photos.')
          }
        }

        toast.success(`${editedData.name} added successfully!`)
        onSuccess()
        onClose()
        return
      }

      // Legacy single-image flow (DocumentReader re-OCR path)
      let imageUrl: string | undefined = undefined

      if (imageFile) {
        try {
          logger.info('[MedicationReviewModal] Uploading medication image (legacy flow)')
          imageUrl = await uploadMedicationImage(imageFile, user.uid, selectedPatientId)
          logger.info('[MedicationReviewModal] Image uploaded successfully', { imageUrl })
        } catch (uploadError) {
          logger.error('[MedicationReviewModal] Failed to upload image', uploadError as Error)
          toast.error('Failed to upload image, but will save medication anyway')
        }
      }

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
                onChange={(e) => {
                  setSelectedPatientId(e.target.value)
                  // Manual override clears both the OCR-match hint and
                  // the no-match warning so the banner only ever
                  // describes the current (now user-confirmed) choice.
                  setMatchedFromOCR(false)
                  setUnmatchedOcrName(null)
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a family member</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.type === 'pet' ? '🐾 ' : '👤 '}
                    {patient.name}
                    {patient.relationship ? ` (${getPatientBadgeLabel(patient)})` : ''}
                  </option>
                ))}
              </select>
            )}
            {matchedFromOCR && parsedData.patientName ? (
              <p className="text-xs text-success mt-2 flex items-center gap-1">
                <CheckIcon className="w-3.5 h-3.5" />
                <span>
                  Matched from prescription label
                  <span className="text-muted-foreground"> — &quot;{parsedData.patientName}&quot;</span>
                </span>
              </p>
            ) : unmatchedOcrName ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-start gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  This label names &quot;{unmatchedOcrName}&quot;, who isn&apos;t in your
                  family yet. Pick the right person above, or add them first —
                  so this medication isn&apos;t saved to the wrong record.
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Select which family member this medication belongs to
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Image Preview(s) */}
            {(imagePreviews?.front || imagePreviews?.back) ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Photographed Labels</h3>
                <div className="grid grid-cols-2 gap-3">
                  {imagePreviews?.front && (
                    <div>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <img
                          src={imagePreviews.front}
                          alt="Front of label"
                          className="w-full h-auto object-contain bg-muted"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-1">Front</p>
                    </div>
                  )}
                  {imagePreviews?.back && (
                    <div>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <img
                          src={imagePreviews.back}
                          alt="Back of label"
                          className="w-full h-auto object-contain bg-muted"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-1">Back</p>
                    </div>
                  )}
                </div>

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
            ) : imagePreview ? (
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
            ) : null}

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
