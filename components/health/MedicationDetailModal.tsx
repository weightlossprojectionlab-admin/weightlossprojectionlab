'use client'

import { useState } from 'react'
import { PatientMedication } from '@/types/medical'
import { ScannedMedication } from '@/lib/medication-lookup'
import { XMarkIcon, ClockIcon, CalendarIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import MedicationAdherenceHistory from '@/components/patients/MedicationAdherenceHistory'
import { DocumentReader } from '@/components/medications/DocumentReader'
import { ParsedMedicationData } from '@/lib/medication-parser'
import MedicationDataReviewModal from '@/components/medications/MedicationDataReviewModal'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface MedicationDetailModalProps {
  medication: PatientMedication | ScannedMedication
  onClose: () => void
  patientId?: string // Optional - needed for adherence history
  onMedicationUpdated?: () => void // Optional - callback when medication is updated
}

export default function MedicationDetailModal({ medication, onClose, patientId, onMedicationUpdated }: MedicationDetailModalProps) {
  const [showDocumentReader, setShowDocumentReader] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [extractedData, setExtractedData] = useState<ParsedMedicationData | null>(null)
  const [applying, setApplying] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  // Type guard to check if medication is ScannedMedication
  const isScannedMedication = (med: PatientMedication | ScannedMedication): med is ScannedMedication => {
    return 'patientName' in med
  }

  // Get patient name if available
  const patientName = isScannedMedication(medication) ? medication.patientName : undefined

  // Check expiration status
  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return null

    try {
      const expDate = new Date(expirationDate)
      const today = new Date()
      const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiration < 0) {
        return { status: 'expired', message: 'EXPIRED', color: 'text-error', bgColor: 'bg-error-light dark:bg-red-900/20' }
      } else if (daysUntilExpiration <= 30) {
        return { status: 'expiring-soon', message: `Expires in ${daysUntilExpiration} days`, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' }
      }
      return null
    } catch (e) {
      return null
    }
  }

  const expirationStatus = getExpirationStatus(medication.expirationDate)

  // Handle "Read Label" button click - start OCR directly
  const handleReadLabel = async () => {
    console.log('[MedicationDetailModal] ===== READ LABEL CLICKED =====')
    const imageUrl = medication.imageUrl || medication.photoUrl
    console.log('[MedicationDetailModal] Image URL:', imageUrl)

    if (!imageUrl) {
      toast.error('No medication image available')
      return
    }

    // Open review modal immediately with extracting state
    console.log('[MedicationDetailModal] Opening review modal with extracting state')
    setIsExtracting(true)
    setShowReviewModal(true)

    try {
      // Import OCR functions
      console.log('[MedicationDetailModal] Importing OCR functions...')
      const { extractTextFromImage } = await import('@/lib/ocr-gemini-client')
      const { parseMedicationLabel } = await import('@/lib/medication-parser')

      // Extract text from image
      console.log('[MedicationDetailModal] Starting OCR extraction...')
      const ocrResult = await extractTextFromImage(imageUrl)
      console.log('[MedicationDetailModal] OCR Result:', ocrResult)

      if (!ocrResult.text || ocrResult.text.trim() === '') {
        console.error('[MedicationDetailModal] OCR failed - no text extracted:', ocrResult)
        toast.error('Failed to read label. Please try again.')
        setIsExtracting(false)
        setShowReviewModal(false)
        return
      }

      // Parse medication data
      console.log('[MedicationDetailModal] Parsing medication data...')
      const parsedData = await parseMedicationLabel(ocrResult.text)
      console.log('[MedicationDetailModal] Parsed data:', parsedData)

      if (Object.keys(parsedData).length === 0) {
        console.error('[MedicationDetailModal] No data extracted')
        toast.error('No medication data could be extracted from the label')
        setIsExtracting(false)
        setShowReviewModal(false)
        return
      }

      // Update modal with extracted data
      console.log('[MedicationDetailModal] Setting extracted data and stopping extraction')
      setExtractedData(parsedData)
      setIsExtracting(false)
      console.log('[MedicationDetailModal] ===== EXTRACTION COMPLETE =====')

    } catch (error) {
      console.error('[MedicationDetailModal] OCR extraction failed:', error)
      toast.error(`Failed to extract medication data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsExtracting(false)
      setShowReviewModal(false)
    }
  }

  // Handle extracted medication data (from DocumentReader - legacy)
  const handleMedicationDataExtracted = async (data: ParsedMedicationData) => {
    console.log('[MedicationDetailModal] Extracted medication data:', data)

    // Show review modal with extracted data
    setExtractedData(data)
    setShowDocumentReader(false)
    setShowReviewModal(true)
  }

  // Handle applying the extracted data after review
  const handleApplyExtractedData = async () => {
    if (!patientId || !extractedData) return

    setApplying(true)
    try {
      const updates: Partial<PatientMedication> = {}

      // Only update fields that were extracted (don't overwrite with undefined)
      if (extractedData.name) updates.name = extractedData.name
      if (extractedData.brandName) updates.brandName = extractedData.brandName
      if (extractedData.strength) updates.strength = extractedData.strength
      if (extractedData.dosageForm) updates.dosageForm = extractedData.dosageForm
      if (extractedData.frequency) updates.frequency = extractedData.frequency
      if (extractedData.prescribedFor) updates.prescribedFor = extractedData.prescribedFor
      if (extractedData.prescribingDoctor) updates.prescribingDoctor = extractedData.prescribingDoctor
      if (extractedData.rxNumber) updates.rxNumber = extractedData.rxNumber
      if (extractedData.ndc) updates.ndc = extractedData.ndc
      if (extractedData.quantity) updates.quantity = extractedData.quantity
      if (extractedData.refills) updates.refills = extractedData.refills
      if (extractedData.fillDate) updates.fillDate = extractedData.fillDate
      if (extractedData.expirationDate) updates.expirationDate = extractedData.expirationDate
      if (extractedData.pharmacyName) updates.pharmacyName = extractedData.pharmacyName
      if (extractedData.pharmacyPhone) updates.pharmacyPhone = extractedData.pharmacyPhone
      if (extractedData.warnings) updates.warnings = extractedData.warnings

      const currentMed = medication as PatientMedication

      logger.info('[MedicationDetailModal] Applying extracted medication data', {
        medicationId: currentMed.id,
        extractedFields: Object.keys(updates)
      })

      await medicalOperations.medications.updateMedication(
        patientId,
        currentMed.id,
        updates
      )

      toast.success(`Medication updated! ${Object.keys(updates).length} field${Object.keys(updates).length !== 1 ? 's' : ''} applied.`)

      logger.info('[MedicationDetailModal] Medication updated successfully', {
        updatedFields: Object.keys(updates)
      })

      // Call callback to refresh medication list
      if (onMedicationUpdated) {
        onMedicationUpdated()
      }

      setShowReviewModal(false)
      setExtractedData(null)
      onClose() // Close the detail modal
    } catch (error) {
      logger.error('[MedicationDetailModal] Failed to update medication', error as Error)
      toast.error('Failed to update medication. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
    {/* Main Detail Modal - hide when review modal is open */}
    {!showReviewModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-2xl">💊</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {medication.name}
              </h2>
              {medication.brandName && (
                <p className="text-sm text-muted-foreground italic">
                  Brand: {medication.brandName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Medication Image */}
          {(medication.imageUrl || medication.photoUrl) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Medication Bottle Image</h3>
                <button
                  onClick={handleReadLabel}
                  disabled={isExtracting}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExtracting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Extracting...
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="w-4 h-4" />
                      Read Label
                    </>
                  )}
                </button>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <img
                  src={medication.imageUrl || medication.photoUrl}
                  alt={`${medication.name} bottle`}
                  className="w-full max-w-md mx-auto rounded-lg border-2 border-border hover:border-primary transition-all cursor-pointer"
                  onClick={() => window.open(medication.imageUrl || medication.photoUrl, '_blank')}
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Click to enlarge
                </p>
              </div>
            </div>
          )}

          {/* Warning Banners */}
          {expirationStatus && (expirationStatus.status === 'expired' || expirationStatus.status === 'expiring-soon') && (
            <div className={`${expirationStatus.bgColor} rounded-lg px-4 py-3 flex items-center gap-3`}>
              <ExclamationTriangleIcon className={`w-6 h-6 ${expirationStatus.color}`} />
              <div>
                <p className={`font-bold ${expirationStatus.color}`}>
                  {expirationStatus.message}
                </p>
                {medication.pharmacyPhone && (
                  <a
                    href={`tel:${medication.pharmacyPhone}`}
                    className="text-sm underline hover:no-underline mt-1 inline-block"
                  >
                    Call pharmacy to refill: {medication.pharmacyPhone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Strength</div>
              <div className="text-lg font-semibold text-foreground">{medication.strength}</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Dosage Form</div>
              <div className="text-lg font-semibold text-foreground capitalize">{medication.dosageForm}</div>
            </div>
          </div>

          {/* Prescription Information */}
          {medication.prescribedFor && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Prescribed For</h3>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <p className="text-base font-medium text-purple-900 dark:text-purple-100">{medication.prescribedFor}</p>
              </div>
            </div>
          )}

          {/* Dosage Instructions */}
          {medication.frequency && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Dosage Instructions
              </h3>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-foreground">{medication.frequency}</p>
              </div>
            </div>
          )}

          {/* Prescription Details */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Prescription Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medication.rxNumber && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[80px]">Rx Number:</span>
                  <span className="text-sm font-medium text-foreground">{medication.rxNumber}</span>
                </div>
              )}
              {medication.ndc && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[80px]">NDC:</span>
                  <span className="text-sm font-mono text-foreground">{medication.ndc}</span>
                </div>
              )}
              {medication.prescribingDoctor && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <span className="text-sm text-muted-foreground min-w-[80px]">Prescriber:</span>
                  <span className="text-sm font-medium text-foreground">Dr. {medication.prescribingDoctor}</span>
                </div>
              )}
              {medication.quantity && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[80px]">Quantity:</span>
                  <span className="text-sm font-medium text-foreground">{medication.quantity}</span>
                </div>
              )}
              {medication.refills && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[80px]">Refills:</span>
                  <span className="text-sm font-medium text-foreground">{medication.refills}</span>
                </div>
              )}
              {medication.drugClass && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <span className="text-sm text-muted-foreground min-w-[80px]">Drug Class:</span>
                  <span className="text-sm font-medium text-foreground">{medication.drugClass}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          {(medication.fillDate || medication.expirationDate) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Important Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medication.fillDate && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Fill Date</div>
                    <div className="text-sm font-medium text-foreground">
                      {new Date(medication.fillDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {medication.expirationDate && (
                  <div className={`rounded-lg p-3 ${expirationStatus ? expirationStatus.bgColor : 'bg-muted'}`}>
                    <div className="text-xs text-muted-foreground mb-1">Expiration Date</div>
                    <div className={`text-sm font-medium ${expirationStatus?.color || 'text-foreground'}`}>
                      {new Date(medication.expirationDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pharmacy Information */}
          {(medication.pharmacyName || medication.pharmacyPhone) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pharmacy</h3>
              <div className="bg-muted rounded-lg p-4">
                {medication.pharmacyName && (
                  <p className="text-base font-medium text-foreground mb-1">{medication.pharmacyName}</p>
                )}
                {medication.pharmacyPhone && (
                  <a
                    href={`tel:${medication.pharmacyPhone}`}
                    className="text-sm text-primary hover:text-primary-dark underline"
                  >
                    {medication.pharmacyPhone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {medication.warnings && medication.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Important Warnings
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <ul className="space-y-2">
                  {medication.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
                      <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Patient Name (if from ScannedMedication) */}
          {patientName && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Patient</h3>
              <div className="bg-primary-light rounded-lg p-3">
                <p className="text-base font-medium text-primary-dark dark:text-purple-200">{patientName}</p>
              </div>
            </div>
          )}

          {/* Adherence History (if patientId provided and medication is PatientMedication) */}
          {patientId && !isScannedMedication(medication) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Adherence History</h3>
              <MedicationAdherenceHistory patientId={patientId} medication={medication as PatientMedication} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    )}

      {/* Review Modal for Extracted Data */}
      {showReviewModal && (
        <MedicationDataReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false)
            setExtractedData(null)
            setIsExtracting(false)
          }}
          onApply={handleApplyExtractedData}
          extractedData={extractedData}
          currentMedication={medication as PatientMedication}
          applying={applying}
          isExtracting={isExtracting}
        />
      )}
    </>
  )
}
