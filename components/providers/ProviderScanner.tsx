/**
 * Provider Scanner Component
 *
 * Scan provider information from documents (business cards, appointment cards,
 * referral letters, etc.) using OCR
 */

'use client'

import { useState, useRef } from 'react'
import { extractProviderFromImage, ExtractedProviderInfo, mapSpecialtyToProviderType } from '@/lib/ocr-provider'
import { CameraIcon, DocumentIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface ProviderScannerProps {
  onExtracted: (info: ExtractedProviderInfo) => void
  onClose: () => void
}

export function ProviderScanner({ onExtracted, onClose }: ProviderScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extractedInfo, setExtractedInfo] = useState<ExtractedProviderInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    try {
      setError(null)
      setScanning(true)

      // Create preview
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Extract provider info
      const info = await extractProviderFromImage(file)

      // Infer provider type from specialty if not detected
      if (!info.type && info.specialty) {
        info.type = mapSpecialtyToProviderType(info.specialty)
      }

      setExtractedInfo(info)
    } catch (err: any) {
      setError(err.message || 'Failed to scan document')
      console.error('Provider scan error:', err)
    } finally {
      setScanning(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUseInfo = () => {
    if (extractedInfo) {
      onExtracted(extractedInfo)
      onClose()
    }
  }

  const handleRetry = () => {
    setPreviewUrl(null)
    setExtractedInfo(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Scan Provider Document
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Take a photo or upload a business card, appointment card, or referral letter
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!previewUrl && (
            <>
              {/* Upload Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors"
                >
                  <CameraIcon className="w-12 h-12 text-purple-600" />
                  <div className="text-center">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Take Photo</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use camera</p>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors"
                >
                  <DocumentIcon className="w-12 h-12 text-purple-600" />
                  <div className="text-center">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Upload Image</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From gallery</p>
                  </div>
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  📋 Tips for Best Results
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Ensure good lighting and avoid shadows</li>
                  <li>• Keep the document flat and in focus</li>
                  <li>• Include the entire card or document in frame</li>
                  <li>• Works best with business cards, appointment cards, and letterheads</li>
                </ul>
              </div>
            </>
          )}

          {/* Scanning State */}
          {scanning && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Scanning document...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Extracting provider information</p>
            </div>
          )}

          {/* Error State */}
          {error && !scanning && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Results */}
          {previewUrl && extractedInfo && !scanning && (
            <>
              {/* Preview Image */}
              <div className="mb-6">
                <div className="relative w-full aspect-[3/2] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <Image
                    src={previewUrl}
                    alt="Scanned document"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Extracted Information */}
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Extracted Information
                  </h3>
                  <span className="ml-auto text-xs text-green-700 dark:text-green-300">
                    {Math.round(extractedInfo.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  {extractedInfo.name && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Name:</span>
                      <span className="text-green-900 dark:text-green-100">{extractedInfo.name}</span>
                    </div>
                  )}
                  {extractedInfo.specialty && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Specialty:</span>
                      <span className="text-green-900 dark:text-green-100">{extractedInfo.specialty}</span>
                    </div>
                  )}
                  {extractedInfo.type && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Type:</span>
                      <span className="text-green-900 dark:text-green-100 capitalize">{extractedInfo.type.replace('_', ' ')}</span>
                    </div>
                  )}
                  {extractedInfo.phone && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Phone:</span>
                      <span className="text-green-900 dark:text-green-100">{extractedInfo.phone}</span>
                    </div>
                  )}
                  {extractedInfo.fax && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Fax:</span>
                      <span className="text-green-900 dark:text-green-100">{extractedInfo.fax}</span>
                    </div>
                  )}
                  {extractedInfo.email && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Email:</span>
                      <span className="text-green-900 dark:text-green-100">{extractedInfo.email}</span>
                    </div>
                  )}
                  {extractedInfo.address && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Address:</span>
                      <span className="text-green-900 dark:text-green-100">
                        {extractedInfo.address}
                        {extractedInfo.city && `, ${extractedInfo.city}`}
                        {extractedInfo.state && `, ${extractedInfo.state}`}
                        {extractedInfo.zipCode && ` ${extractedInfo.zipCode}`}
                      </span>
                    </div>
                  )}
                  {extractedInfo.npiNumber && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">NPI:</span>
                      <span className="text-green-900 dark:text-green-100">{extractedInfo.npiNumber}</span>
                    </div>
                  )}
                  {extractedInfo.officeHours && (
                    <div className="flex">
                      <span className="text-green-700 dark:text-green-300 font-medium w-24">Hours:</span>
                      <span className="text-green-900 dark:text-green-100">{extractedInfo.officeHours}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleUseInfo}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Use This Information
                </button>
                <button
                  onClick={handleRetry}
                  className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Scan Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
