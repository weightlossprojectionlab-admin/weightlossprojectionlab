'use client'

import { useState, useRef, useEffect } from 'react'
import { XMarkIcon, CameraIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { lookupMedicationByNDC, ScannedMedication, searchMedicationByName, MedicationInfo } from '@/lib/medication-lookup'
import { extractMedicationFromImage, convertToScannedMedication, calculateExtractionConfidence, SuggestedCondition } from '@/lib/ocr-medication'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { Spinner } from '@/components/ui/Spinner'
import { storage, auth } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

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
  const [medicationImageUrl, setMedicationImageUrl] = useState<string | null>(null)
  const [medicationImages, setMedicationImages] = useState<Array<{url: string, label: string}>>([])
  const [processingMultipleImages, setProcessingMultipleImages] = useState(false)

  // Manual entry state
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MedicationInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Patient name state
  const [patientName, setPatientName] = useState<string>('')

  // OCR file input refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const multiFileInputRef = useRef<HTMLInputElement>(null)

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
      setMedicationImageUrl(null)
      setMedicationImages([])
      setProcessingMultipleImages(false)
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
   * Handle multiple OCR image uploads
   */
  const handleMultipleOCRImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    logger.info('[Medication Scanner] Multiple OCR images uploaded', { count: files.length })
    setProcessingMultipleImages(true)
    setScanStatus('processing')
    setScanMode('ocr')
    setOcrProgress(0)

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const uploadedImages: Array<{url: string, label: string}> = []
      let mergedMedicationData: any = null

      // Process each image
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const label = i === 0 ? 'Front' : i === 1 ? 'Back' : `Side ${i - 1}`

        logger.info(`[Medication Scanner] Processing image ${i + 1}/${files.length}: ${label}`)

        // Upload image to Firebase Storage
        const timestamp = Date.now()
        const fileExtension = file.name.split('.').pop() || 'jpg'
        const storageRef = ref(
          storage,
          `medications/${user.uid}/${timestamp}_${i}.${fileExtension}`
        )

        await uploadBytes(storageRef, file, {
          contentType: file.type,
          customMetadata: {
            uploadedBy: user.uid,
            uploadedAt: new Date().toISOString(),
            imageLabel: label
          }
        })

        const imageUrl = await getDownloadURL(storageRef)
        uploadedImages.push({ url: imageUrl, label })
        logger.info(`[Medication Scanner] Image ${i + 1} uploaded`, { url: imageUrl, label })

        // Extract medication data from this image
        const extracted = await extractMedicationFromImage(file, (progress) => {
          const overallProgress = Math.floor(((i + progress / 100) / files.length) * 100)
          setOcrProgress(overallProgress)
        })

        if (extracted) {
          // Merge with existing data
          if (!mergedMedicationData) {
            mergedMedicationData = extracted
          } else {
            // Merge: prefer non-empty values from new extraction
            mergedMedicationData = {
              medicationName: mergedMedicationData.medicationName || extracted.medicationName,
              strength: mergedMedicationData.strength !== 'Unknown' ? mergedMedicationData.strength : extracted.strength,
              dosageForm: mergedMedicationData.dosageForm !== 'Unknown' ? mergedMedicationData.dosageForm : extracted.dosageForm,
              frequency: mergedMedicationData.frequency || extracted.frequency,
              rxNumber: mergedMedicationData.rxNumber || extracted.rxNumber,
              ndc: mergedMedicationData.ndc || extracted.ndc,
              expirationDate: mergedMedicationData.expirationDate || extracted.expirationDate,
              pharmacy: mergedMedicationData.pharmacy || extracted.pharmacy,
              pharmacyPhone: mergedMedicationData.pharmacyPhone || extracted.pharmacyPhone,
              patientName: mergedMedicationData.patientName || extracted.patientName,
              fillDate: mergedMedicationData.fillDate || extracted.fillDate,
              quantity: mergedMedicationData.quantity || extracted.quantity,
              refills: mergedMedicationData.refills || extracted.refills,
              prescribingDoctor: mergedMedicationData.prescribingDoctor || extracted.prescribingDoctor,
              suggestedConditions: mergedMedicationData.suggestedConditions || extracted.suggestedConditions
            }
          }
        }
      }

      if (mergedMedicationData) {
        const confidence = calculateExtractionConfidence(mergedMedicationData)
        setOcrConfidence(confidence)

        // Store suggested conditions
        if (mergedMedicationData.suggestedConditions && mergedMedicationData.suggestedConditions.length > 0) {
          setSuggestedConditions(mergedMedicationData.suggestedConditions)
          const highestConfidence = mergedMedicationData.suggestedConditions[0]
          if (highestConfidence.confidence >= 90) {
            setSelectedCondition(highestConfidence.condition)
          }
        }

        const finalCondition = selectedCondition || prescribedFor
        const scanned = convertToScannedMedication(mergedMedicationData, finalCondition)

        setScannedMedication(scanned)
        setMedicationImages(uploadedImages)
        setMedicationImageUrl(uploadedImages[0]?.url || null) // Use first image as primary

        if (mergedMedicationData.patientName && !patientName) {
          setPatientName(mergedMedicationData.patientName)
        }

        setScannedPhotos(files.length)
        setScanStatus('success')
        toast.success(`Processed ${files.length} image(s) successfully`)
      } else {
        setScanStatus('error')
        setErrorMessage('Could not extract medication info from images')
        toast.error('OCR extraction failed')
      }
    } catch (error) {
      logger.error('[Medication Scanner] Multiple OCR failed', error as Error)
      setScanStatus('error')
      setErrorMessage('Failed to process images')
      toast.error('OCR failed')
    } finally {
      setOcrProgress(0)
      setProcessingMultipleImages(false)
    }
  }

  /**
   * Handle single OCR image upload (legacy)
   */
  const handleOCRImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    logger.info('[Medication Scanner] OCR image uploaded')
    setScanStatus('processing')
    setScanMode('ocr')
    setOcrProgress(0)

    try {
      // Upload image to Firebase Storage first
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const storageRef = ref(
        storage,
        `medications/${user.uid}/${timestamp}.${fileExtension}`
      )

      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString(),
        }
      })

      const imageUrl = await getDownloadURL(storageRef)
      setMedicationImageUrl(imageUrl)
      logger.info('[Medication Scanner] Image uploaded to storage', { imageUrl })

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
      // Ensure the selected condition, patient name, and image URL are set on the medication
      const finalMedication = {
        ...scannedMedication,
        prescribedFor: selectedCondition || scannedMedication.prescribedFor || prescribedFor,
        patientName: patientName || undefined,
        imageUrl: medicationImageUrl || undefined,
        photoUrl: medicationImageUrl || undefined  // Support both field names for compatibility
      }

      logger.info('[MedicationScanner] Final medication data', {
        name: finalMedication.name,
        hasImageUrl: !!finalMedication.imageUrl,
        hasPhotoUrl: !!finalMedication.photoUrl,
        imageUrl: finalMedication.imageUrl,
        photoUrl: finalMedication.photoUrl
      })

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
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              Scan Medication Label
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Scan mode options - Mobile optimized with larger touch targets */}
          <div className="space-y-4">
            {/* Recommended: Multi-Photo OCR Scan */}
            <div className="relative">
              <div className="absolute -top-2 left-4 px-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded">
                ⭐ BEST RESULTS
              </div>
              <button
                onClick={() => multiFileInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-5 sm:p-4 rounded-lg border-2 border-primary bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/40 dark:hover:to-blue-900/40 transition-all min-h-[72px] sm:min-h-0 active:scale-98"
              >
                <CameraIcon className="w-10 h-10 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-foreground text-base sm:text-sm">
                    📸 Take Multiple Photos
                  </div>
                  <div className="text-sm sm:text-xs text-muted-foreground">
                    Capture front, back & side for complete info
                  </div>
                </div>
              </button>
            </div>

            {/* Single Photo OCR Scan */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-4 p-5 sm:p-4 rounded-lg border-2 border-border hover:border-primary transition-all min-h-[72px] sm:min-h-0 active:scale-98"
            >
              <CameraIcon className="w-10 h-10 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold text-foreground text-base sm:text-sm">
                  📷 Single Photo
                </div>
                <div className="text-sm sm:text-xs text-muted-foreground">
                  Quick scan - may miss some details
                </div>
              </div>
            </button>

            {/* Barcode Scan */}
            <button
              onClick={() => setScanMode('barcode')}
              className="w-full flex items-center gap-4 p-5 sm:p-4 rounded-lg border-2 border-border hover:border-primary transition-all min-h-[72px] sm:min-h-0 active:scale-98"
            >
              <CameraIcon className="w-10 h-10 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold text-foreground text-base sm:text-sm">
                  Scan NDC Barcode
                </div>
                <div className="text-sm sm:text-xs text-muted-foreground">
                  Scan barcode with camera
                </div>
              </div>
            </button>

            {/* Manual Search */}
            <button
              onClick={() => setScanMode('manual')}
              className="w-full flex items-center gap-4 p-5 sm:p-4 rounded-lg border-2 border-border hover:border-primary transition-all min-h-[72px] sm:min-h-0 active:scale-98"
            >
              <DocumentTextIcon className="w-10 h-10 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold text-foreground">Enter Manually</div>
                <div className="text-sm text-muted-foreground">Search and select</div>
              </div>
            </button>
          </div>

          {/* Hidden file input for OCR - Single image */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleOCRImageUpload}
            className="hidden"
          />

          {/* Hidden file input for multi-image upload */}
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleMultipleOCRImageUpload}
            className="hidden"
            id="multi-image-input"
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
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-foreground font-medium">
              {scanMode === 'barcode' ? 'Looking up medication...' : 'Extracting medication info...'}
            </p>

            {/* Show OCR progress bar */}
            {scanMode === 'ocr' && ocrProgress > 0 && (
              <div className="w-full mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {ocrProgress < 100 ? 'Scanning label...' : 'Processing...'}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {ocrProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
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
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-xl font-bold text-foreground">
              Search Medication
            </h3>
            <button
              onClick={() => {
                setScanMode('select')
                setScanStatus('idle')
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Search input */}
          <div className="p-6 border-b border-border">
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
              <p className="text-center text-muted-foreground">
                Enter medication name to search
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleManualSelect(result)}
                    className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary transition-all"
                  >
                    <div className="font-semibold text-foreground">
                      {result.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
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
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
            <h3 className="text-xl font-bold text-foreground">
              Confirm Medication
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-4">
            {/* Success icon */}
            <div className="flex justify-center mb-4">
              <CheckCircleIcon className="w-12 h-12 text-success" />
            </div>

          {/* Medication details */}
          <div className="bg-background rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Medication Name</div>
                <div className="font-semibold text-foreground">{scannedMedication.name}</div>
              </div>

              {scannedMedication.strength && (
                <div>
                  <div className="text-sm text-muted-foreground">Strength</div>
                  <div className="font-semibold text-foreground">{scannedMedication.strength}</div>
                </div>
              )}

              {scannedMedication.dosageForm && (
                <div>
                  <div className="text-sm text-muted-foreground">Form</div>
                  <div className="font-semibold text-foreground">{scannedMedication.dosageForm}</div>
                </div>
              )}

              {scannedMedication.frequency && (
                <div>
                  <div className="text-sm text-muted-foreground">Frequency</div>
                  <div className="font-semibold text-foreground">{scannedMedication.frequency}</div>
                </div>
              )}

              {scannedMedication.rxNumber && (
                <div>
                  <div className="text-sm text-muted-foreground">Rx Number</div>
                  <div className="font-semibold text-foreground">{scannedMedication.rxNumber}</div>
                </div>
              )}

              {scannedMedication.ndc && (
                <div>
                  <div className="text-sm text-muted-foreground">NDC</div>
                  <div className="font-semibold text-foreground">{scannedMedication.ndc}</div>
                </div>
              )}

              {scannedMedication.quantity && (
                <div>
                  <div className="text-sm text-muted-foreground">Quantity</div>
                  <div className="font-semibold text-foreground">{scannedMedication.quantity}</div>
                </div>
              )}

              {scannedMedication.refills && (
                <div>
                  <div className="text-sm text-muted-foreground">Refills</div>
                  <div className="font-semibold text-foreground">{scannedMedication.refills}</div>
                </div>
              )}

              {scannedMedication.fillDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Fill Date</div>
                  <div className="font-semibold text-foreground">{scannedMedication.fillDate}</div>
                </div>
              )}

              {scannedMedication.expirationDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Expires</div>
                  <div className="font-semibold text-foreground">{scannedMedication.expirationDate}</div>
                </div>
              )}

              {scannedMedication.pharmacyName && (
                <div>
                  <div className="text-sm text-muted-foreground">Pharmacy</div>
                  <div className="font-semibold text-foreground">{scannedMedication.pharmacyName}</div>
                </div>
              )}

              {scannedMedication.pharmacyPhone && (
                <div>
                  <div className="text-sm text-muted-foreground">Pharmacy Phone</div>
                  <div className="font-semibold text-foreground">{scannedMedication.pharmacyPhone}</div>
                </div>
              )}

              {scannedMedication.prescribingDoctor && (
                <div>
                  <div className="text-sm text-muted-foreground">Prescriber</div>
                  <div className="font-semibold text-foreground">Dr. {scannedMedication.prescribingDoctor}</div>
                </div>
              )}

              {scannedMedication.warnings && scannedMedication.warnings.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">⚠️ Warnings</div>
                  <ul className="list-disc list-inside space-y-1">
                    {scannedMedication.warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-foreground">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {prescribedFor && !suggestedConditions.length && (
                <div>
                  <div className="text-sm text-muted-foreground">Prescribed For</div>
                  <div className="font-semibold text-foreground">{prescribedFor}</div>
                </div>
              )}
            </div>

            {/* Suggested Conditions (AI-powered) */}
            {suggestedConditions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm font-medium text-foreground mb-2">
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
                          ? 'border-primary bg-primary-light'
                          : 'border-border hover:border-border dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {suggestion.condition}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {suggestion.reasoning}
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          {/* Confidence badge */}
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            suggestion.confidence >= 90
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                              : suggestion.confidence >= 70
                              ? 'bg-yellow-100 text-warning-dark dark:bg-yellow-900/30'
                              : 'bg-muted text-foreground dark:text-gray-200'
                          }`}>
                            {suggestion.confidence}%
                          </span>
                          {/* Selection indicator */}
                          {selectedCondition === suggestion.condition && (
                            <CheckCircleIcon className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                  💡 AI-powered suggestion based on medical databases. Select the correct condition or confirm auto-selection.
                </p>
              </div>
            )}

            {/* OCR confidence indicator */}
            {ocrConfidence !== null && scanMode === 'ocr' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
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

            {/* Medication Images Preview */}
            {medicationImages.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm font-medium text-foreground mb-2">
                  📸 Captured Images ({medicationImages.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {medicationImages.map((img, idx) => (
                    <div key={idx} className="bg-muted rounded-lg p-2">
                      <div className="text-xs font-semibold text-center text-primary mb-1">
                        {img.label}
                      </div>
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full rounded border border-border cursor-pointer hover:border-primary transition-colors"
                        onClick={() => window.open(img.url, '_blank')}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  All images will be saved with the medication • Click to enlarge
                </p>
              </div>
            ) : medicationImageUrl && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm font-medium text-foreground mb-2">📸 Captured Image</div>
                <div className="bg-muted rounded-lg p-2">
                  <img
                    src={medicationImageUrl}
                    alt="Medication bottle"
                    className="w-full max-w-xs mx-auto rounded border border-border"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    This image will be saved with the medication
                  </p>
                </div>
              </div>
            )}
            </div>

            {/* Patient Name Input */}
            <div className="mb-4">
            <label htmlFor="patientName" className="block text-sm font-medium text-foreground mb-2">
              Who is this medication for? (Optional)
              {scannedMedication?.patientName && (
                <span className="ml-2 text-xs text-success dark:text-green-400 font-normal">
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
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary focus:ring-2 focus:ring-purple-600/20 transition-colors"
            />
            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
              💡 Helps track medications for different family members
            </p>
            </div>

            {/* Prescriber Input */}
            <div className="mb-4">
            <label htmlFor="prescriberName" className="block text-sm font-medium text-foreground mb-2">
              Prescribing Doctor
              {scannedMedication?.prescribingDoctor && (
                <span className="ml-2 text-xs text-success dark:text-green-400 font-normal">
                  ✓ Auto-detected from label
                </span>
              )}
            </label>
            <input
              id="prescriberName"
              type="text"
              value={scannedMedication?.prescribingDoctor || ''}
              onChange={(e) => {
                if (scannedMedication) {
                  setScannedMedication({
                    ...scannedMedication,
                    prescribingDoctor: e.target.value
                  })
                }
              }}
              placeholder="e.g., Dr. Smith, Dr. V.Atieh"
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary focus:ring-2 focus:ring-purple-600/20 transition-colors"
            />
            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
              👨‍⚕️ Add or correct the prescribing doctor's name
            </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
            {/* Add Another Photo Option - Show if missing key info OR if only 1 photo taken */}
            {(scannedPhotos === 1 || (!scannedMedication?.rxNumber && !scannedMedication?.pharmacyName && !scannedMedication?.prescribingDoctor)) && (
              <div className="space-y-2">
                {/* Show missing info alert */}
                {(!scannedMedication?.rxNumber || !scannedMedication?.expirationDate || !scannedMedication?.pharmacyName || !scannedMedication?.prescribingDoctor) && (
                  <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                          Missing Important Information
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                          We couldn't find these details on the front label:
                        </p>
                        <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5 ml-4 list-disc">
                          {!scannedMedication?.prescribingDoctor && <li>Prescribing Doctor</li>}
                          {!scannedMedication?.rxNumber && <li>Prescription Number (Rx#)</li>}
                          {!scannedMedication?.expirationDate && <li>Expiration Date</li>}
                          {!scannedMedication?.pharmacyName && <li>Pharmacy Information</li>}
                          {!scannedMedication?.ndc && <li>NDC Code</li>}
                        </ul>
                        <p className="text-xs text-amber-800 dark:text-amber-200 mt-2 font-medium">
                          💡 Scan the back or side of the bottle to capture these details, or add them manually above
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    // Keep the scanned medication but allow another photo
                    setAllowAdditionalPhoto(false)
                    setScanStatus('idle')
                    setScanMode('select')
                  }}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 sm:py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg transition-all font-semibold min-h-[56px] sm:min-h-0 active:scale-98 shadow-lg"
                >
                  <CameraIcon className="w-6 h-6 sm:w-5 sm:h-5" />
                  <span className="text-base sm:text-sm">📋 Scan Back/Side Label</span>
                </button>
                <p className="text-xs text-center text-muted-foreground">
                  This will help us capture Rx#, expiration date, and pharmacy details
                </p>
              </div>
            )}
            </div>
          </div>

          {/* Fixed Footer - Buttons */}
          <div className="border-t border-border p-6 pt-4 bg-card">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setScanMode('select')
                  setScanStatus('idle')
                  setScannedMedication(null)
                  setScannedPhotos(0)
                  setAllowAdditionalPhoto(false)
                  setMedicationImageUrl(null)
                }}
                className="flex-1 px-5 py-3 sm:py-2 border-2 border-border rounded-lg text-foreground hover:bg-background transition-colors font-medium min-h-[52px] sm:min-h-0 active:scale-98"
              >
                Start Over
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-5 py-3 sm:py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium min-h-[52px] sm:min-h-0 active:scale-98"
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
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              Scan Failed
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
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
