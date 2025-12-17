'use client'

import { useState, useRef, useEffect } from 'react'
import * as React from 'react'
import { XMarkIcon, DocumentTextIcon, PhotoIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { extractTextFromImage, extractTextFromPDF, type OCRProgress } from '@/lib/ocr-gemini-client'
import { parseMedicationLabel, type ParsedMedicationData } from '@/lib/medication-parser'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { MedicationReviewModal } from './MedicationReviewModal'

interface DocumentReaderProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  patientId: string
  onTextExtracted?: (text: string) => void
  preloadedImageUrl?: string // Optional: pre-load an image from URL
}

export function DocumentReader({ isOpen, onClose, onSuccess, patientId, onTextExtracted, preloadedImageUrl }: DocumentReaderProps) {
  console.log('🔍 [DocumentReader] patientId =', patientId)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [usePreloadedImage, setUsePreloadedImage] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [parsedMedicationData, setParsedMedicationData] = useState<ParsedMedicationData | null>(null)

  // Auto-use preloaded image if provided
  React.useEffect(() => {
    if (isOpen && preloadedImageUrl && !selectedFile) {
      setPreviewUrl(preloadedImageUrl)
      setUsePreloadedImage(true)
      setExtractedText('')
    }
  }, [isOpen, preloadedImageUrl, selectedFile])

  if (!isOpen) return null

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error('Please select an image (JPG, PNG, HEIC) or PDF file')
      return
    }

    setSelectedFile(file)
    setExtractedText('')

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleExtractText = async () => {
    if (!selectedFile && !usePreloadedImage) {
      toast.error('Please select a file first')
      return
    }

    try {
      setIsProcessing(true)
      setExtractedText('')

      let fileDataUrl: string

      if (usePreloadedImage && preloadedImageUrl) {
        // Use the preloaded image URL directly
        logger.info('[Document Reader] Starting OCR with preloaded image', {
          imageUrl: preloadedImageUrl.substring(0, 100)
        })
        fileDataUrl = preloadedImageUrl
      } else if (selectedFile) {
        // Convert uploaded file to data URL
        logger.info('[Document Reader] Starting OCR', {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size
        })

        const reader = new FileReader()
        fileDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(selectedFile)
        })
      } else {
        toast.error('No image available')
        return
      }

      // Store the data URL in state for later use
      setImageDataUrl(fileDataUrl)

      let result: { text: string; confidence: number }

      if (selectedFile?.type === 'application/pdf') {
        // For PDFs, use extractTextFromPDF
        const results = await extractTextFromPDF(fileDataUrl, setOcrProgress)
        const combinedText = results.map((r, i) => `--- Page ${i + 1} ---\n${r.text}`).join('\n\n')
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

        result = {
          text: combinedText,
          confidence: avgConfidence
        }
      } else {
        // For images (uploaded or preloaded), use extractTextFromImage
        result = await extractTextFromImage(fileDataUrl, setOcrProgress)
      }

      setExtractedText(result.text)

      logger.info('[Document Reader] OCR completed', {
        textLength: result.text.length,
        confidence: result.confidence
      })

      toast.success(`Text extracted with ${Math.round(result.confidence)}% confidence`)

      // Call callback if provided
      if (onTextExtracted) {
        onTextExtracted(result.text)
      }

      // Parse medication data and show review modal
      logger.info('[Document Reader] Starting medication parsing...')

      if (result.text) {
        try {
          const loadingToast = toast.loading('Parsing medication information...')
          const parsedData = await parseMedicationLabel(result.text)

          logger.info('[Document Reader] Medication data parsed', {
            fields: Object.keys(parsedData).length,
            parsedData
          })

          toast.dismiss(loadingToast)

          // Show review modal if we got meaningful data
          if (Object.keys(parsedData).length > 0) {
            toast.success('Medication information extracted!')
            logger.info('[Document Reader] Opening review modal', {
              hasFile: !!selectedFile,
              hasDataUrl: !!imageDataUrl,
              extractedTextLength: result.text.length
            })

            // Store data and show review modal
            logger.info('[Document Reader] Opening review modal with patientId', {
              patientId: patientId,
              patientIdType: typeof patientId,
              patientIdValue: JSON.stringify(patientId),
              patientIdLength: patientId?.length
            })
            setParsedMedicationData(parsedData)
            setShowReviewModal(true)
          } else {
            logger.warn('[Document Reader] No medication fields extracted')
            toast.error('No medication information found in text')
          }
        } catch (parseError) {
          logger.error('[Document Reader] Failed to parse medication data', parseError as Error)
          toast.error('Failed to parse medication information. Text extracted successfully.')
        }
      }

    } catch (error) {
      logger.error('[Document Reader] OCR failed', error as Error)
      toast.error('Failed to extract text from document')
    } finally {
      setIsProcessing(false)
      setOcrProgress(null)
    }
  }

  const handleCopyText = () => {
    if (!extractedText) return

    navigator.clipboard.writeText(extractedText)
    toast.success('Text copied to clipboard')
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl(preloadedImageUrl || null)
    setExtractedText('')
    setOcrProgress(null)
    setUsePreloadedImage(!!preloadedImageUrl)
    setImageDataUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Document Reader</h2>
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
          {/* File Upload */}
          {!selectedFile && !usePreloadedImage && (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Upload Document or Image
              </h3>
              <p className="text-muted-foreground mb-6">
                Select an image (JPG, PNG, HEIC) or PDF to extract text
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/heic,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                <ArrowUpTrayIcon className="w-5 h-5" />
                Choose File
              </button>
            </div>
          )}

          {/* File Preview & Processing */}
          {(selectedFile || usePreloadedImage) && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    {selectedFile ? (
                      <>
                        <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">Medication Label Image</p>
                        <p className="text-xs text-muted-foreground mt-1">Preloaded from medication</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {usePreloadedImage ? 'Upload Different Image' : 'Change File'}
                  </button>
                </div>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="w-full h-auto max-h-96 object-contain bg-muted"
                  />
                </div>
              )}

              {/* Extract Button */}
              {!extractedText && !isProcessing && (
                <button
                  onClick={handleExtractText}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  Extract Text with Gemini Vision
                </button>
              )}

              {/* Progress */}
              {isProcessing && ocrProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{ocrProgress.message}</span>
                    <span className="text-foreground font-medium">{ocrProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${ocrProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Extracted Text */}
              {extractedText && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Extracted Text</h3>
                    <button
                      onClick={handleCopyText}
                      className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                    >
                      Copy Text
                    </button>
                  </div>
                  <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                      {extractedText}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
          {extractedText && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Read Another Document
            </button>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {parsedMedicationData && (
        <MedicationReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false)
            setParsedMedicationData(null)
          }}
          onSuccess={() => {
            if (onSuccess) {
              onSuccess()
            }
            handleReset()
          }}
          patientId={patientId}
          parsedData={parsedMedicationData}
          extractedText={extractedText}
          imageFile={selectedFile || undefined}
          imagePreview={imageDataUrl || previewUrl || undefined}
        />
      )}
    </div>
  )
}
