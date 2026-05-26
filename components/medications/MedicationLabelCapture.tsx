'use client'

import { useCallback, useRef, useState } from 'react'
import { ArrowUpTrayIcon, CameraIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { extractMedicationFromTwoImages, type ExtractedMedicationText } from '@/lib/ocr-medication'
import type { ParsedMedicationData } from '@/lib/medication-parser'
import { logger } from '@/lib/logger'
import { useFileDrop } from '@/hooks/useFileDrop'
import toast from 'react-hot-toast'
import { MedicationReviewModal } from './MedicationReviewModal'

// Read a File as a base64 data URL. Pure helper — lives at module
// scope so the useCallback deps below stay stable across renders.
const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

interface MedicationLabelCaptureProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  patientId: string
}

type Step = 'front' | 'back' | 'processing'

function toParsedMedicationData(extracted: ExtractedMedicationText): ParsedMedicationData {
  return {
    name: extracted.medicationName,
    strength: extracted.strength,
    dosageForm: extracted.dosageForm,
    frequency: extracted.frequency,
    prescribingDoctor: extracted.prescribingDoctor,
    patientName: extracted.patientName,
    rxNumber: extracted.rxNumber,
    ndc: extracted.ndc,
    quantity: extracted.quantity,
    refills: extracted.refills,
    fillDate: extracted.fillDate,
    expirationDate: extracted.expirationDate,
    pharmacyName: extracted.pharmacy,
    pharmacyPhone: extracted.pharmacyPhone,
    warnings: extracted.warnings
  }
}

export function MedicationLabelCapture({ isOpen, onClose, onSuccess, patientId }: MedicationLabelCaptureProps) {
  const [step, setStep] = useState<Step>('front')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)

  const [parsedData, setParsedData] = useState<ParsedMedicationData | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [showReview, setShowReview] = useState(false)

  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('front')
    setFrontFile(null)
    setFrontPreview(null)
    setBackFile(null)
    setBackPreview(null)
    setParsedData(null)
    setExtractedText('')
    setShowReview(false)
    if (frontInputRef.current) frontInputRef.current.value = ''
    if (backInputRef.current) backInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Shared file processors — both the file input change handler AND
  // the drag-drop handler route through these. useFileDrop already
  // type-checks `image/*` before invoking, so callers from drag-drop
  // skip the input-side guard. We keep the guard for the input path
  // because some browsers will pass through non-image files even when
  // accept="image/*" is set (the attribute is a hint, not a contract).
  const processFrontFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setFrontFile(file)
      setFrontPreview(dataUrl)
      setStep('back')
    } catch (err) {
      logger.error('[MedicationLabelCapture] Failed to read front image', err as Error)
      toast.error('Failed to read image')
    }
  }, [])

  const processBackFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setBackFile(file)
      setBackPreview(dataUrl)
    } catch (err) {
      logger.error('[MedicationLabelCapture] Failed to read back image', err as Error)
      toast.error('Failed to read image')
    }
  }, [])

  const handleFrontSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFrontFile(file)
  }

  const handleBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processBackFile(file)
  }

  // Drag-drop targets. Each pane gets its own drop zone — they're
  // displayed sequentially (front then back) so collision isn't a
  // concern. `isDragging` toggles a visual outline so the user knows
  // the zone is ready to accept the drop.
  const { isDragging: isFrontDragging, dropHandlers: frontDropHandlers } = useFileDrop({
    onFile: processFrontFile,
  })
  const { isDragging: isBackDragging, dropHandlers: backDropHandlers } = useFileDrop({
    onFile: processBackFile,
  })

  // Early return AFTER all hooks have been called — Rules of Hooks
  // requires every hook to fire in the same order on every render. The
  // closed-modal render still has to call useState, useRef, useCallback,
  // and useFileDrop or React fails with "Rendered more hooks than during
  // the previous render."
  if (!isOpen) return null

  const handleRetakeFront = () => {
    setFrontFile(null)
    setFrontPreview(null)
    setStep('front')
    if (frontInputRef.current) frontInputRef.current.value = ''
  }

  const handleRetakeBack = () => {
    setBackFile(null)
    setBackPreview(null)
    if (backInputRef.current) backInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!frontFile) {
      toast.error('Please take a photo of the front of the label first')
      return
    }
    setStep('processing')
    const loadingToast = toast.loading(backFile ? 'Analyzing both photos…' : 'Analyzing photo…')

    try {
      const extracted = await extractMedicationFromTwoImages(frontFile, backFile)
      toast.dismiss(loadingToast)

      if (!extracted || !extracted.medicationName) {
        toast.error('Could not read the label. Please try clearer photos.')
        setStep(backFile ? 'back' : 'front')
        return
      }

      const parsed = toParsedMedicationData(extracted)
      logger.info('[MedicationLabelCapture] Extraction complete', {
        medicationName: parsed.name,
        strength: parsed.strength,
        hadBack: !!backFile
      })

      setParsedData(parsed)
      setExtractedText(extracted.rawText || '')
      setShowReview(true)
      // Reset step out of 'processing' so when the review modal closes
      // (whether via Save or Cancel), the outer modal isn't stuck on
      // the spinner. Drop back to whichever capture step would let the
      // user retake — matches the catch-block behavior below.
      setStep(backFile ? 'back' : 'front')
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('[MedicationLabelCapture] Extraction error', error as Error)
      toast.error('Failed to read the label')
      setStep(backFile ? 'back' : 'front')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Photograph Prescription Label</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {step === 'front' && (
              <div>
                <div className="bg-secondary-light border border-secondary-light rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-secondary-dark mb-1">
                    📸 Step 1 of 2 — Photograph the front of the label
                  </h3>
                  <p className="text-sm text-secondary-dark">
                    This is the small main label with the drug name, strength, Rx number, and prescriber.
                  </p>
                </div>

                <div
                  {...frontDropHandlers}
                  className={`border-2 rounded-lg p-12 text-center transition-colors ${
                    isFrontDragging
                      ? 'border-solid border-primary bg-primary/5'
                      : 'border-dashed border-border'
                  }`}
                >
                  {isFrontDragging ? (
                    <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-primary mb-4" />
                  ) : (
                    <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  )}
                  <p className="text-muted-foreground mb-4">
                    {isFrontDragging
                      ? 'Release to upload the front of the label.'
                      : <>Take a clear photo of the <strong>front</strong> of the prescription bottle.</>
                    }
                  </p>

                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFrontSelect}
                    className="hidden"
                    id="med-front-upload"
                  />
                  <label
                    htmlFor="med-front-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium cursor-pointer bg-primary hover:bg-primary-hover text-white transition-colors"
                  >
                    <CameraIcon className="w-5 h-5" />
                    <span>Take Front Photo</span>
                  </label>

                  <p className="text-xs text-muted-foreground mt-4">
                    Good lighting, no glare, the whole label in frame.
                    {' '}
                    <span className="hidden md:inline">Or drag and drop an image here.</span>
                  </p>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleClose}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 'back' && (
              <div>
                <div className="bg-success-light dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    ✓ Front photo captured.
                  </p>
                </div>

                {frontPreview && (
                  <div className="mb-4 flex items-start gap-3">
                    <img
                      src={frontPreview}
                      alt="Front of label"
                      className="w-24 h-24 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={handleRetakeFront}
                      className="text-sm text-primary hover:underline mt-1"
                    >
                      Retake front
                    </button>
                  </div>
                )}

                <div className="bg-secondary-light border border-secondary-light rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-secondary-dark mb-1">
                    📸 Step 2 of 2 — Photograph the back/wraparound panel
                  </h3>
                  <p className="text-sm text-secondary-dark">
                    This is the larger panel with dosage instructions, warnings, refills, and NDC.
                  </p>
                </div>

                <div
                  {...backDropHandlers}
                  className={`border-2 rounded-lg p-12 text-center transition-colors ${
                    isBackDragging
                      ? 'border-solid border-primary bg-primary/5'
                      : 'border-dashed border-border'
                  }`}
                >
                  {isBackDragging ? (
                    <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-primary mb-4" />
                  ) : (
                    <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  )}
                  <p className="text-muted-foreground mb-4">
                    {isBackDragging
                      ? 'Release to upload the back of the label.'
                      : <>Take a clear photo of the <strong>back/side</strong> of the prescription bottle.</>
                    }
                  </p>

                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleBackSelect}
                    className="hidden"
                    id="med-back-upload"
                  />
                  <label
                    htmlFor="med-back-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium cursor-pointer bg-primary hover:bg-primary-hover text-white transition-colors"
                  >
                    <CameraIcon className="w-5 h-5" />
                    <span>{backPreview ? 'Change Back Photo' : 'Take Back Photo'}</span>
                  </label>
                  <p className="hidden md:block text-xs text-muted-foreground mt-4">
                    Or drag and drop an image here.
                  </p>

                  {backPreview && (
                    <div className="mt-4">
                      <img
                        src={backPreview}
                        alt="Back of label"
                        className="mx-auto max-h-48 rounded-lg border-2 border-green-500"
                      />
                      <p className="text-green-600 dark:text-green-400 text-sm mt-2">
                        ✓ Back photo captured
                      </p>
                      <button
                        onClick={handleRetakeBack}
                        className="text-sm text-primary hover:underline mt-1"
                      >
                        Retake back
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3 mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={!frontFile}
                    className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {backFile ? 'Continue' : 'Continue with Front Only'}
                  </button>
                  {!backFile && (
                    <button
                      onClick={handleSubmit}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      Skip — only front available
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="py-16 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-foreground font-medium">
                  {backFile ? 'Analyzing both photos…' : 'Analyzing photo…'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Reading the prescription label and extracting medication details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {parsedData && (
        <MedicationReviewModal
          isOpen={showReview}
          onClose={() => {
            setShowReview(false)
            setParsedData(null)
          }}
          onSuccess={() => {
            if (onSuccess) onSuccess()
            reset()
          }}
          patientId={patientId}
          parsedData={parsedData}
          extractedText={extractedText}
          imageFiles={{ front: frontFile || undefined, back: backFile || undefined }}
          imagePreviews={{ front: frontPreview || undefined, back: backPreview || undefined }}
        />
      )}
    </>
  )
}
