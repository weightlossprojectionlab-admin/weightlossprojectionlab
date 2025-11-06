'use client'

import { useState, useRef, useEffect } from 'react'
import { XMarkIcon, CameraIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { lookupMedicationByNDC, ScannedMedication, searchMedicationByName } from '@/lib/medication-lookup'
import { extractMedicationFromImage, convertToScannedMedication, calculateExtractionConfidence } from '@/lib/ocr-medication'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { Spinner } from '@/components/ui/Spinner'

interface MedicationScannerProps {
  isOpen: boolean
  onClose: () => void
  onMedicationScanned: (medication: ScannedMedication) => void
  prescribedFor?: string // Condition name (e.g., "Type 2 Diabetes")
}

type ScanMode = 'select' | 'barcode' | 'ocr' | 'manual'
type ScanStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error'

export default function MedicationScanner({
  isOpen,
  onClose,
  onMedicationScanned,
  prescribedFor
}: MedicationScannerProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('select')
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [scannedMedication, setScannedMedication] = useState<ScannedMedication | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null)

  // Manual entry state
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // OCR file input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setScanMode('select')
      setScanStatus('idle')
      setScannedMedication(null)
      setErrorMessage(null)
      setOcrConfidence(null)
      setManualSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen])

  if (!isOpen) return null

  /**
   * Handle NDC barcode scan
   */
  const handleBarcodeScan = async (ndc: string) => {
    logger.info('[Medication Scanner] NDC scanned', { ndc })
    setScanStatus('processing')
    setScanMode('barcode')

    try {
      const medication = await lookupMedicationByNDC(ndc)

      if (medication) {
        const scanned: ScannedMedication = {
          ...medication,
          prescribedFor,
          scannedAt: new Date().toISOString()
        }

        setScannedMedication(scanned)
        setScanStatus('success')
        toast.success(`Medication found: ${medication.name}`)
      } else {
        setScanStatus('error')
        setErrorMessage('NDC not found in database. Try OCR scan or manual entry.')
        toast.error('Medication not found')
      }
    } catch (error) {
      logger.error('[Medication Scanner] NDC lookup failed', error as Error)
      setScanStatus('error')
      setErrorMessage('Failed to look up medication. Try OCR scan or manual entry.')
      toast.error('Lookup failed')
    }
  }

  /**
   * Handle OCR image upload
   */
  const handleOCRImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    logger.info('[Medication Scanner] OCR image uploaded')
    setScanStatus('processing')
    setScanMode('ocr')

    try {
      const extracted = await extractMedicationFromImage(file)

      if (extracted) {
        const confidence = calculateExtractionConfidence(extracted)
        setOcrConfidence(confidence)

        const scanned = convertToScannedMedication(extracted, prescribedFor)
        setScannedMedication(scanned)
        setScanStatus('success')

        if (confidence >= 70) {
          toast.success(`Medication extracted: ${extracted.medicationName}`)
        } else {
          toast.success('Medication extracted with low confidence. Please verify.')
        }
      } else {
        setScanStatus('error')
        setErrorMessage('Could not read medication label. Try barcode scan or manual entry.')
        toast.error('OCR extraction failed')
      }
    } catch (error) {
      logger.error('[Medication Scanner] OCR failed', error as Error)
      setScanStatus('error')
      setErrorMessage('Failed to process image. Try barcode scan or manual entry.')
      toast.error('OCR failed')
    }
  }

  /**
   * Handle manual medication search
   */
  const handleManualSearch = async () => {
    if (!manualSearchQuery || manualSearchQuery.length < 3) {
      toast.error('Enter at least 3 characters')
      return
    }

    setIsSearching(true)

    try {
      const results = await searchMedicationByName(manualSearchQuery)
      setSearchResults(results)

      if (results.length === 0) {
        toast('No medications found. Try a different spelling.')
      }
    } catch (error) {
      logger.error('[Medication Scanner] Search failed', error as Error)
      toast.error('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  /**
   * Handle manual medication selection
   */
  const handleManualSelect = (result: any) => {
    const scanned: ScannedMedication = {
      name: result.name,
      strength: result.strength,
      dosageForm: result.dosageForm,
      ndc: result.ndc || '',
      rxcui: result.rxcui,
      prescribedFor,
      scannedAt: new Date().toISOString()
    }

    setScannedMedication(scanned)
    setScanStatus('success')
    setScanMode('manual')
  }

  /**
   * Confirm and save scanned medication
   */
  const handleConfirm = () => {
    if (scannedMedication) {
      onMedicationScanned(scannedMedication)
      toast.success('Medication added')
      onClose()
    }
  }

  /**
   * Render scan mode selection screen
   */
  if (scanMode === 'select' && scanStatus === 'idle') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Scan Medication Label
            </h3>
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Scan mode options */}
          <div className="space-y-3">
            <button
              onClick={() => setScanMode('barcode')}
              className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
            >
              <CameraIcon className="w-8 h-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Scan NDC Barcode</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Most accurate method</div>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
            >
              <DocumentTextIcon className="w-8 h-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Scan Label with OCR</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Take photo of label</div>
              </div>
            </button>

            <button
              onClick={() => setScanMode('manual')}
              className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
            >
              <DocumentTextIcon className="w-8 h-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Enter Manually</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Search and select</div>
              </div>
            </button>
          </div>

          {/* Hidden file input for OCR */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleOCRImageUpload}
            className="hidden"
          />
        </div>
      </div>
    )
  }

  /**
   * Render barcode scanner
   */
  if (scanMode === 'barcode' && scanStatus !== 'success') {
    return (
      <BarcodeScanner
        isOpen={true}
        onClose={() => {
          setScanMode('select')
          setScanStatus('idle')
        }}
        onScan={handleBarcodeScan}
        context="meal"
        title="Scan NDC Barcode on Prescription Label"
      />
    )
  }

  /**
   * Render processing state
   */
  if (scanStatus === 'processing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-900 dark:text-gray-100">
            {scanMode === 'barcode' ? 'Looking up medication...' : 'Extracting medication info...'}
          </p>
        </div>
      </div>
    )
  }

  /**
   * Render manual search mode
   */
  if (scanMode === 'manual' && scanStatus !== 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Search Medication
            </h3>
            <button
              onClick={() => {
                setScanMode('select')
                setScanStatus('idle')
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Search input */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                placeholder="Enter medication name..."
                className="form-input flex-1"
              />
              <button
                onClick={handleManualSearch}
                disabled={isSearching}
                className="btn btn-primary inline-flex items-center justify-center"
              >
                {isSearching ? <Spinner size="sm" /> : 'Search'}
              </button>
            </div>
          </div>

          {/* Search results */}
          <div className="flex-1 overflow-y-auto p-6">
            {searchResults.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">
                Enter medication name to search
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleManualSelect(result)}
                    className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {result.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {result.strength} {result.dosageForm}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render success confirmation screen
   */
  if (scanStatus === 'success' && scannedMedication) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Confirm Medication
            </h3>
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Success icon */}
          <div className="flex justify-center mb-4">
            <CheckCircleIcon className="w-16 h-16 text-success" />
          </div>

          {/* Medication details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Medication Name</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.name}</div>
              </div>

              {scannedMedication.strength && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Strength</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.strength}</div>
                </div>
              )}

              {scannedMedication.dosageForm && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Form</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.dosageForm}</div>
                </div>
              )}

              {scannedMedication.frequency && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Frequency</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.frequency}</div>
                </div>
              )}

              {prescribedFor && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Prescribed For</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{prescribedFor}</div>
                </div>
              )}
            </div>

            {/* OCR confidence warning */}
            {ocrConfidence !== null && ocrConfidence < 70 && (
              <div className="mt-4 p-3 bg-warning-light dark:bg-warning-dark/20 rounded-lg">
                <p className="text-xs text-warning-dark dark:text-warning-light">
                  ⚠️ Low confidence OCR extraction. Please verify the information is correct.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setScanMode('select')
                setScanStatus('idle')
                setScannedMedication(null)
              }}
              className="btn btn-outline flex-1"
            >
              Try Again
            </button>
            <button
              onClick={handleConfirm}
              className="btn btn-primary flex-1"
            >
              Confirm & Add
            </button>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render error state
   */
  if (scanStatus === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Scan Failed
            </h3>
            <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Error message */}
          <div className="bg-error-light dark:bg-error-dark/20 rounded-lg p-4 mb-6">
            <p className="text-error-dark dark:text-error-light">
              {errorMessage || 'Failed to scan medication. Please try again.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setScanMode('select')
                setScanStatus('idle')
                setErrorMessage(null)
              }}
              className="btn btn-primary flex-1"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
