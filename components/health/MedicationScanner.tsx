'use client'

import { useState, useRef, useEffect } from 'react'
import { XMarkIcon, CameraIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { lookupMedicationByNDC, ScannedMedication, searchMedicationByName, MedicationInfo } from '@/lib/medication-lookup'
import { extractMedicationFromImage, convertToScannedMedication, calculateExtractionConfidence, SuggestedCondition } from '@/lib/ocr-medication'
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
  const [ocrProgress, setOcrProgress] = useState<number>(0)
  const [suggestedConditions, setSuggestedConditions] = useState<SuggestedCondition[]>([])
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null)
  const [scannedPhotos, setScannedPhotos] = useState<number>(0)
  const [allowAdditionalPhoto, setAllowAdditionalPhoto] = useState(false)

  // Manual entry state
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MedicationInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Patient name state
  const [patientName, setPatientName] = useState<string>('')

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
      setOcrProgress(0)
      setSuggestedConditions([])
      setSelectedCondition(null)
      setScannedPhotos(0)
      setAllowAdditionalPhoto(false)
      setManualSearchQuery('')
      setSearchResults([])
      setPatientName('')
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
    setOcrProgress(0)

    try {
      // Pass progress callback to show OCR progress
      const extracted = await extractMedicationFromImage(file, (progress) => {
        setOcrProgress(progress)
      })

      if (extracted) {
        const confidence = calculateExtractionConfidence(extracted)
        setOcrConfidence(confidence)

        // Store suggested conditions from classification
        if (extracted.suggestedConditions && extracted.suggestedConditions.length > 0) {
          setSuggestedConditions(extracted.suggestedConditions)

          // Auto-select highest confidence condition (>= 90%)
          const highestConfidence = extracted.suggestedConditions[0]
          if (highestConfidence.confidence >= 90) {
            setSelectedCondition(highestConfidence.condition)
            logger.info('[Medication Scanner] Auto-selected condition', {
              medication: extracted.medicationName,
              condition: highestConfidence.condition,
              confidence: highestConfidence.confidence
            })
          }
        }

        // Use selected condition if available, otherwise fall back to prescribedFor prop
        const finalCondition = selectedCondition || prescribedFor

        // If this is an additional photo, merge with existing data
        const scanned = scannedPhotos > 0 && scannedMedication
          ? {
              ...scannedMedication,
              // Only update fields that are missing or empty in previous scan
              name: scannedMedication.name || extracted.medicationName,
              strength: scannedMedication.strength !== 'Unknown' ? scannedMedication.strength : (extracted.strength || 'Unknown'),
              dosageForm: scannedMedication.dosageForm !== 'Unknown' ? scannedMedication.dosageForm : (extracted.dosageForm || 'Unknown'),
              frequency: scannedMedication.frequency || extracted.frequency,
              rxNumber: scannedMedication.rxNumber || extracted.rxNumber,
              prescribedFor: finalCondition,
              patientName: scannedMedication.patientName || extracted.patientName
            }
          : convertToScannedMedication(extracted, finalCondition)

        setScannedMedication(scanned)

        // Auto-populate patient name field if extracted from label
        if (extracted.patientName && !patientName) {
          setPatientName(extracted.patientName)
          logger.info('[Medication Scanner] Auto-populated patient name from label', { patientName: extracted.patientName })
        }

        setScannedPhotos(prev => prev + 1)
        setAllowAdditionalPhoto(true)
        setScanStatus('success')

        if (scannedPhotos > 0) {
          toast.success('Additional details captured and merged')
        } else if (confidence >= 70) {
          toast.success(`Medication extracted: ${extracted.medicationName}`)
        } else if (confidence >= 50) {
          toast.success('Medication extracted with medium confidence. Please verify.')
        } else {
          toast.success('Medication extracted with low confidence. Please verify all details.')
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
    } finally {
      setOcrProgress(0)
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
  const handleManualSelect = (result: MedicationInfo) => {
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
      // Ensure the selected condition and patient name are set on the medication
      const finalMedication = {
        ...scannedMedication,
        prescribedFor: selectedCondition || scannedMedication.prescribedFor || prescribedFor,
        patientName: patientName || undefined
      }

      onMedicationScanned(finalMedication)

      if (patientName && selectedCondition) {
        toast.success(`Medication added for ${patientName} (${selectedCondition})`)
      } else if (patientName) {
        toast.success(`Medication added for ${patientName}`)
      } else if (selectedCondition) {
        toast.success(`Medication added for ${selectedCondition}`)
      } else {
        toast.success('Medication added')
      }

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

          {/* Scan mode options - Mobile optimized with larger touch targets */}
          <div className="space-y-4">
            {/* Recommended: OCR Scan */}
            <div className="relative">
              <div className="absolute -top-2 left-4 px-2 bg-purple-600 text-white text-xs font-bold rounded">
                RECOMMENDED
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-5 sm:p-4 rounded-lg border-2 border-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all min-h-[72px] sm:min-h-0 active:scale-98"
              >
                <CameraIcon className="w-10 h-10 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-sm">
                    📸 Take Photo of Label
                  </div>
                  <div className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">
                    AI extracts all info (name, dose, Rx#)
                  </div>
                </div>
              </button>
            </div>

            {/* Barcode Scan */}
            <button
              onClick={() => setScanMode('barcode')}
              className="w-full flex items-center gap-4 p-5 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all min-h-[72px] sm:min-h-0 active:scale-98"
            >
              <CameraIcon className="w-10 h-10 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-sm">
                  Scan NDC Barcode
                </div>
                <div className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">
                  Scan barcode with camera
                </div>
              </div>
            </button>

            {/* Manual Search */}
            <button
              onClick={() => setScanMode('manual')}
              className="w-full flex items-center gap-4 p-5 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all min-h-[72px] sm:min-h-0 active:scale-98"
            >
              <DocumentTextIcon className="w-10 h-10 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left flex-1">
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
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-900 dark:text-gray-100 font-medium">
              {scanMode === 'barcode' ? 'Looking up medication...' : 'Extracting medication info...'}
            </p>

            {/* Show OCR progress bar */}
            {scanMode === 'ocr' && ocrProgress > 0 && (
              <div className="w-full mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {ocrProgress < 100 ? 'Scanning label...' : 'Processing...'}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {ocrProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
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

              {scannedMedication.rxNumber && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rx Number</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.rxNumber}</div>
                </div>
              )}

              {scannedMedication.ndc && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">NDC</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.ndc}</div>
                </div>
              )}

              {scannedMedication.quantity && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Quantity</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.quantity}</div>
                </div>
              )}

              {scannedMedication.refills && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Refills</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.refills}</div>
                </div>
              )}

              {scannedMedication.fillDate && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Fill Date</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.fillDate}</div>
                </div>
              )}

              {scannedMedication.expirationDate && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Expires</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.expirationDate}</div>
                </div>
              )}

              {scannedMedication.pharmacyName && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pharmacy</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.pharmacyName}</div>
                </div>
              )}

              {scannedMedication.pharmacyPhone && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pharmacy Phone</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{scannedMedication.pharmacyPhone}</div>
                </div>
              )}

              {scannedMedication.warnings && scannedMedication.warnings.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">⚠️ Warnings</div>
                  <ul className="list-disc list-inside space-y-1">
                    {scannedMedication.warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-gray-700 dark:text-gray-300">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {prescribedFor && !suggestedConditions.length && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Prescribed For</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{prescribedFor}</div>
                </div>
              )}
            </div>

            {/* Suggested Conditions (AI-powered) */}
            {suggestedConditions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  This medication is typically prescribed for:
                </div>
                <div className="space-y-2">
                  {suggestedConditions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedCondition(suggestion.condition)
                        // Update scanned medication with new condition
                        if (scannedMedication) {
                          setScannedMedication({
                            ...scannedMedication,
                            prescribedFor: suggestion.condition
                          })
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedCondition === suggestion.condition
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {suggestion.condition}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {suggestion.reasoning}
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          {/* Confidence badge */}
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            suggestion.confidence >= 90
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                              : suggestion.confidence >= 70
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {suggestion.confidence}%
                          </span>
                          {/* Selection indicator */}
                          {selectedCondition === suggestion.condition && (
                            <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 AI-powered suggestion based on medical databases. Select the correct condition or confirm auto-selection.
                </p>
              </div>
            )}

            {/* OCR confidence indicator */}
            {ocrConfidence !== null && scanMode === 'ocr' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Extraction Confidence
                  </span>
                  <span className={`text-xs font-bold ${
                    ocrConfidence >= 70 ? 'text-success' : ocrConfidence >= 50 ? 'text-warning-dark' : 'text-error-dark'
                  }`}>
                    {ocrConfidence}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      ocrConfidence >= 70 ? 'bg-success' : ocrConfidence >= 50 ? 'bg-warning' : 'bg-error'
                    }`}
                    style={{ width: `${ocrConfidence}%` }}
                  />
                </div>
                {ocrConfidence < 70 && (
                  <p className="text-xs text-warning-dark dark:text-warning-light mt-2">
                    ⚠️ {ocrConfidence < 50 ? 'Low' : 'Medium'} confidence extraction. Please verify all details are correct.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Patient Name Input */}
          <div className="mb-4">
            <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Who is this medication for? (Optional)
              {scannedMedication?.patientName && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">
                  ✓ Auto-detected from label
                </span>
              )}
            </label>
            <input
              id="patientName"
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g., Me, Mom, Dad, Johnny..."
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-colors"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Helps track medications for different family members
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* Add Another Photo Option */}
            {allowAdditionalPhoto && scannedPhotos === 1 && (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    📸 <strong>Tip:</strong> Scan the back label to capture Rx#, NDC, prescriber, and pharmacy details
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Keep the scanned medication but allow another photo
                    setAllowAdditionalPhoto(false)
                    setScanStatus('idle')
                    setScanMode('select')
                  }}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 sm:py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-medium min-h-[56px] sm:min-h-0 active:scale-98"
                >
                  <CameraIcon className="w-6 h-6 sm:w-5 sm:h-5" />
                  <span className="text-base sm:text-sm">📋 Scan Back Label (Optional)</span>
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setScanMode('select')
                  setScanStatus('idle')
                  setScannedMedication(null)
                  setScannedPhotos(0)
                  setAllowAdditionalPhoto(false)
                }}
                className="flex-1 px-5 py-3 sm:py-2 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium min-h-[52px] sm:min-h-0 active:scale-98"
              >
                Start Over
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-5 py-3 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium min-h-[52px] sm:min-h-0 active:scale-98"
              >
                ✅ Confirm & Add
              </button>
            </div>
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
