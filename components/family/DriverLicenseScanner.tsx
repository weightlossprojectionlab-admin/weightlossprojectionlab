'use client'

import { useState, useRef } from 'react'
import { scanDriversLicenseFront, type LicenseData } from '@/lib/drivers-license-ocr'
import { CameraIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { AlertModal } from '@/components/ui/AlertModal'
import { logger } from '@/lib/logger'

export interface DriverLicenseScannerProps {
  onScanComplete: (data: {
    name: string
    dateOfBirth: string
    gender: string
    streetAddress?: string
    city?: string
    state?: string
    zipCode?: string
    frontImage?: string
    backImage?: string
  }) => void
  onClose: () => void
  isOpen: boolean
}

/**
 * Driver's License Scanner Component
 *
 * Uses OCR to extract text from the FRONT of a driver's license
 * to auto-fill family member information
 */
export function DriverLicenseScanner({ onScanComplete, onClose, isOpen }: DriverLicenseScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState<LicenseData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [scanStep, setScanStep] = useState<'front' | 'back' | 'preview'>('front')
  const [manualFormData, setManualFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'male',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: ''
  })
  const [errorModal, setErrorModal] = useState<{
    show: boolean
    title: string
    message: string
    type: 'error' | 'success' | 'info' | 'warning'
  }>({
    show: false,
    title: '',
    message: '',
    type: 'error'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const frontImageInputRef = useRef<HTMLInputElement>(null)
  const backImageInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorModal({
        show: true,
        title: 'Invalid File Type',
        message: 'Please select an image file (JPG, PNG, or HEIC)',
        type: 'error'
      })
      return
    }

    setScanning(true)
    setScannedData(null)

    try {
      logger.info('[DL Scanner Component] Processing front image with OCR', { fileName: file.name })

      // Convert file to base64 for storage
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string
        setFrontImage(imageData)

        // Scan the driver's license using OCR
        const licenseData = await scanDriversLicenseFront(file)

        if (!licenseData) {
          // Auto-switch to manual mode after OCR failure
          setManualMode(true)
          setScanning(false)

          setErrorModal({
            show: true,
            title: 'OCR Not Successful',
            message: 'We could not automatically read the license. No problem! We\'ve switched to manual entry mode.\n\nYou can now enter the information yourself and optionally upload photos of both sides of the license for your records.',
            type: 'info'
          })
          return
        }

        // OCR successful - store data and move to back scan step
        setScannedData(licenseData)
        setScanStep('back')
        setScanning(false)
      }
      reader.readAsDataURL(file)

    } catch (error: any) {
      logger.error('[DL Scanner Component] OCR scan failed', error)
      setErrorModal({
        show: true,
        title: 'Scan Failed',
        message: error.message || 'An unexpected error occurred while scanning the license. Please try again or enter information manually.',
        type: 'error'
      })
      setScanning(false)
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleConfirm = () => {
    if (!scannedData) return

    const formData = {
      name: `${scannedData.firstName} ${scannedData.middleName ? scannedData.middleName + ' ' : ''}${scannedData.lastName}`,
      dateOfBirth: scannedData.dateOfBirth,
      gender: scannedData.gender,
      streetAddress: scannedData.streetAddress,
      city: scannedData.city,
      state: scannedData.state,
      zipCode: scannedData.zipCode,
      frontImage: frontImage || undefined,
      backImage: backImage || undefined
    }
    onScanComplete(formData)
    handleClose()
  }

  const handleClose = () => {
    setScannedData(null)
    setShowPreview(false)
    setScanning(false)
    setManualMode(false)
    setFrontImage(null)
    setBackImage(null)
    setScanStep('front')
    onClose()
  }

  const handleFrontImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setFrontImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleBackImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setBackImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleManualSubmit = () => {
    // Validate required fields
    if (!manualFormData.name || !manualFormData.dateOfBirth) {
      setErrorModal({
        show: true,
        title: 'Missing Required Information',
        message: 'Please enter at least your name and date of birth.',
        type: 'warning'
      })
      return
    }

    onScanComplete({
      ...manualFormData,
      frontImage: frontImage || undefined,
      backImage: backImage || undefined
    })
    handleClose()
  }

  return (
    <>
      {/* Alert Modal */}
      <AlertModal
        isOpen={errorModal.show}
        onClose={() => setErrorModal({ show: false, title: '', message: '', type: 'error' })}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
      />

      {/* Main Scanner Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Scan Driver's License
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {manualMode ? (
            /* Manual Entry Mode */
            <div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  📝 <strong>Manual Entry Mode</strong><br/>
                  Enter the information yourself and optionally upload photos of the license for your records.
                </p>
              </div>

              {/* Image Upload Section */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Front Image */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Front of License {frontImage && '✓'}
                  </label>
                  <input
                    ref={frontImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFrontImageUpload}
                    className="hidden"
                    id="front-image-upload"
                  />
                  <label
                    htmlFor="front-image-upload"
                    className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  >
                    {frontImage ? (
                      <img src={frontImage} alt="Front" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <CameraIcon className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Upload Front</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Back Image */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Back of License {backImage && '✓'}
                  </label>
                  <input
                    ref={backImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackImageUpload}
                    className="hidden"
                    id="back-image-upload"
                  />
                  <label
                    htmlFor="back-image-upload"
                    className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  >
                    {backImage ? (
                      <img src={backImage} alt="Back" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <CameraIcon className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Upload Back</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Photos are optional but recommended for your records. They will be securely stored and displayed during appointments.
              </p>

              {/* Manual Entry Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={manualFormData.name}
                    onChange={(e) => setManualFormData({ ...manualFormData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={manualFormData.dateOfBirth}
                    onChange={(e) => setManualFormData({ ...manualFormData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Gender
                  </label>
                  <select
                    value={manualFormData.gender}
                    onChange={(e) => setManualFormData({ ...manualFormData, gender: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={manualFormData.streetAddress}
                    onChange={(e) => setManualFormData({ ...manualFormData, streetAddress: e.target.value })}
                    placeholder="123 Main St"
                    className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      City (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualFormData.city}
                      onChange={(e) => setManualFormData({ ...manualFormData, city: e.target.value })}
                      placeholder="New York"
                      className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={manualFormData.state}
                      onChange={(e) => setManualFormData({ ...manualFormData, state: e.target.value.toUpperCase() })}
                      placeholder="NY"
                      maxLength={2}
                      className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    ZIP Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={manualFormData.zipCode}
                    onChange={(e) => setManualFormData({ ...manualFormData, zipCode: e.target.value })}
                    placeholder="10001"
                    maxLength={10}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleManualSubmit}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Submit Information
                </button>
                <button
                  onClick={() => setManualMode(false)}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Try OCR Again
                </button>
              </div>
            </div>
          ) : scanStep === 'front' ? (
            <div>
              {/* Instructions */}
              <div className="bg-secondary-light border border-secondary-light rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-secondary-dark mb-2">
                  📸 Step 1: Scan Front of License
                </h3>
                <ol className="text-sm text-secondary-dark space-y-1 list-decimal list-inside">
                  <li>Take a clear photo of the <strong>front</strong> of the driver's license</li>
                  <li>Ensure good lighting - avoid glare and shadows</li>
                  <li>Keep the text straight and in focus (no blur)</li>
                  <li>Include the entire license in the frame</li>
                  <li>Hold camera steady or place license on a flat surface</li>
                </ol>
              </div>

              {/* Upload Button */}
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Upload a photo of the <strong>front</strong> of the driver's license
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={scanning}
                  className="hidden"
                  id="license-upload"
                />

                <label
                  htmlFor="license-upload"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                    scanning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-hover text-white'
                  }`}
                >
                  {scanning ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Scanning Front...</span>
                    </>
                  ) : (
                    <>
                      <CameraIcon className="w-5 h-5" />
                      <span>Choose Front Photo</span>
                    </>
                  )}
                </label>

                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-4">
                  Supported formats: JPG, PNG, HEIC
                </p>
              </div>

              {/* Manual Entry Option */}
              <div className="mt-6 flex flex-col gap-2 text-center">
                <button
                  onClick={() => setManualMode(true)}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Skip OCR - Enter Information Manually
                </button>
                <button
                  onClick={handleClose}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : scanStep === 'back' ? (
            <div>
              {/* Success message */}
              <div className="bg-success-light dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✓ Front scanned successfully! Now let's capture the back of the license.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-secondary-light border border-secondary-light rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-secondary-dark mb-2">
                  📸 Step 2: Scan Back of License
                </h3>
                <p className="text-sm text-secondary-dark">
                  Please upload a photo of the <strong>back</strong> of the driver's license for your records.
                </p>
              </div>

              {/* Upload Button */}
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Upload a photo of the <strong>back</strong> of the driver's license
                </p>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackImageUpload}
                  className="hidden"
                  id="back-license-upload"
                />

                <label
                  htmlFor="back-license-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-primary hover:bg-primary-hover text-white"
                >
                  <CameraIcon className="w-5 h-5" />
                  <span>{backImage ? 'Change Back Photo' : 'Choose Back Photo'}</span>
                </label>

                {backImage && (
                  <div className="mt-4">
                    <img src={backImage} alt="Back of license" className="mx-auto max-h-48 rounded-lg border-2 border-green-500" />
                    <p className="text-green-600 dark:text-green-400 text-sm mt-2">✓ Back photo captured</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setScanStep('preview')}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  {backImage ? 'Continue to Review' : 'Skip & Continue'}
                </button>
                <button
                  onClick={() => setScanStep('front')}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Back to Front
                </button>
              </div>
            </div>
          ) : scanStep === 'preview' ? (
            <div>
              {/* Preview Scanned Data */}
              <div className="bg-success-light dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✓ License scanned successfully! Please review the information below:
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      First Name
                    </label>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-foreground">
                        {scannedData?.firstName || 'Not found'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Last Name
                    </label>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-foreground">
                        {scannedData?.lastName || 'Not found'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Date of Birth
                    </label>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-foreground">
                        {scannedData?.dateOfBirth || 'Not found'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Gender
                    </label>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-foreground capitalize">
                        {scannedData?.gender || 'Not found'}
                      </p>
                    </div>
                  </div>
                </div>

                {scannedData?.streetAddress && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Address
                    </label>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-foreground">
                        {scannedData.streetAddress}
                        {scannedData.city && `, ${scannedData.city}`}
                        {scannedData.state && `, ${scannedData.state}`}
                        {scannedData.zipCode && ` ${scannedData.zipCode}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Use This Information
                </button>
                <button
                  onClick={() => {
                    setScanStep('back')
                  }}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Back to Images
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </>
  )
}
