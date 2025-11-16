'use client'

import { useState, useRef } from 'react'
import { scanDriverLicense } from '@/lib/drivers-license-scanner'
import { aamvaToFamilyMember, type AAMVAData } from '@/lib/aamva-parser'
import { CameraIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
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
  }) => void
  onClose: () => void
  isOpen: boolean
}

/**
 * Driver's License Scanner Component
 *
 * Allows users to scan the PDF417 barcode on the back of their driver's license
 * to auto-fill family member information
 */
export function DriverLicenseScanner({ onScanComplete, onClose, isOpen }: DriverLicenseScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState<AAMVAData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setScanning(true)
    setScannedData(null)

    try {
      logger.info('[DL Scanner Component] Processing image', { fileName: file.name })

      // Scan the driver's license
      const aamvaData = await scanDriverLicense(file)

      if (!aamvaData) {
        toast.error('Could not read driver\'s license barcode. Please try again or enter manually.')
        setScanning(false)
        return
      }

      // Show preview of scanned data
      setScannedData(aamvaData)
      setShowPreview(true)
      toast.success('License scanned successfully!')

    } catch (error: any) {
      logger.error('[DL Scanner Component] Scan failed', error)
      toast.error('Failed to scan license: ' + (error.message || 'Unknown error'))
    } finally {
      setScanning(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleConfirm = () => {
    if (!scannedData) return

    const formData = aamvaToFamilyMember(scannedData)
    onScanComplete(formData)
    handleClose()
  }

  const handleClose = () => {
    setScannedData(null)
    setShowPreview(false)
    setScanning(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Scan Driver's License
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showPreview ? (
            <div>
              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How to scan:
                </h3>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Take a clear photo of the <strong>back</strong> of the driver's license</li>
                  <li>Make sure the PDF417 barcode is visible and in focus</li>
                  <li>Upload the photo below</li>
                  <li>Review and confirm the extracted information</li>
                </ol>
              </div>

              {/* Upload Button */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center">
                <CameraIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Upload a photo of the driver's license barcode
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
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {scanning ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <CameraIcon className="w-5 h-5" />
                      <span>Choose Photo</span>
                    </>
                  )}
                </label>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Supported formats: JPG, PNG, HEIC
                </p>
              </div>

              {/* Manual Entry Option */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleClose}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel and enter manually
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Preview Scanned Data */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✓ License scanned successfully! Please review the information below:
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-900 dark:text-gray-100">
                        {scannedData?.firstName || 'Not found'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-900 dark:text-gray-100">
                        {scannedData?.lastName || 'Not found'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-900 dark:text-gray-100">
                        {scannedData?.dateOfBirth || 'Not found'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gender
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-900 dark:text-gray-100 capitalize">
                        {scannedData?.gender || 'Not found'}
                      </p>
                    </div>
                  </div>
                </div>

                {scannedData?.streetAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-900 dark:text-gray-100">
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
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Use This Information
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setScannedData(null)
                  }}
                  className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Scan Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
