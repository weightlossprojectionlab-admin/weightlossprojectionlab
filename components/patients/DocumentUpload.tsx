'use client'

import { useState, useRef, useEffect } from 'react'
import { DocumentTextIcon, PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { medicalOperations } from '@/lib/medical-operations'
import { getCSRFToken, hasCSRFToken } from '@/lib/csrf'
import { extractTextFromMultipleImages, combineOcrResults } from '@/lib/ocr-service'
import type { DocumentCategory } from '@/types/medical'

interface DocumentUploadProps {
  patientId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function DocumentUpload({ patientId, onSuccess, onCancel }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [documentName, setDocumentName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('insurance')
  const [notes, setNotes] = useState('')
  const [csrfReady, setCsrfReady] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ensure CSRF token is available
  useEffect(() => {
    if (hasCSRFToken()) {
      setCsrfReady(true)
    } else {
      // Force token generation
      const token = getCSRFToken()
      console.log('[DocumentUpload] CSRF token ensured:', {
        hasToken: !!token,
        tokenLength: token?.length
      })
      setCsrfReady(true)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(files)
      if (!documentName) {
        setDocumentName(files[0].name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }

    if (!documentName.trim()) {
      toast.error('Please enter a document name')
      return
    }

    // Ensure CSRF token is available before upload
    if (!hasCSRFToken()) {
      const token = getCSRFToken()
      console.log('[DocumentUpload] CSRF token generated before upload:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPreview: token?.substring(0, 20) + '...'
      })
    }

    setUploading(true)
    const uploadToast = toast.loading('Uploading document...')

    try {
      // Step 1: Upload files to Firebase Storage
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const timestamp = Date.now()
        const fileExtension = file.name.split('.').pop()
        const storageRef = ref(
          storage,
          `documents/${patientId}/${timestamp}_${index}.${fileExtension}`
        )

        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)

        return {
          url,
          label: index === 0 ? 'Front' : index === 1 ? 'Back' : `Page ${index + 1}`,
          position: index
        }
      })

      const uploadedImages = await Promise.all(uploadPromises)

      // Determine file type
      const firstFile = selectedFiles[0]
      const fileType = firstFile.type.startsWith('image/') ? 'image' : 'pdf'

      // Step 2: Create document record in Firestore
      toast.loading('Saving document...', { id: uploadToast })

      const uploadedDocument = await medicalOperations.documents.uploadDocument(patientId, {
        name: documentName,
        fileName: firstFile.name,
        category,
        fileType,
        fileSize: selectedFiles.reduce((sum, f) => sum + f.size, 0),
        originalUrl: uploadedImages[0].url,
        images: fileType === 'image' ? uploadedImages : undefined,
        ocrStatus: 'pending',
        notes
      })

      // Step 3: Show success message - upload complete
      toast.success('Document uploaded successfully', { id: uploadToast })

      // Step 4: Start OCR processing in background (don't block UI)
      processOcrInBackground(uploadedDocument, fileType, firstFile, uploadedImages[0].url)

      // Reset form
      setSelectedFiles([])
      setDocumentName('')
      setNotes('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onSuccess?.()
    } catch (error: any) {
      console.error('Error uploading document:', error)

      // Check for CSRF-specific errors
      if (error?.message?.includes('CSRF') || error?.status === 403) {
        toast.error('Security validation failed. Please refresh the page and try again.', { id: uploadToast })
        console.error('[DocumentUpload] CSRF Error Details:', {
          error,
          hasToken: hasCSRFToken(),
          tokenPreview: getCSRFToken()?.substring(0, 20) + '...'
        })
      } else {
        toast.error('Failed to upload document', { id: uploadToast })
      }
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  /**
   * Process OCR in background - don't block user interaction
   */
  const processOcrInBackground = async (
    document: any,
    fileType: string,
    file: File,
    fileUrl: string
  ) => {
    try {
      console.log('[DocumentUpload] Starting background OCR processing', {
        documentId: document.id,
        fileType
      })

      // Show toast notification
      const ocrToast = toast.loading('Extracting text from document...')

      if (fileType === 'pdf') {
        // For PDFs, use the PDF OCR endpoint
        console.log('[DocumentUpload] Processing PDF with /api/ocr/pdf')

        const response = await fetch('/api/ocr/pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfUrl: fileUrl,
            patientId: patientId,
            documentId: document.id
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Text extracted successfully', { id: ocrToast })
          console.log('[DocumentUpload] PDF OCR completed', {
            textLength: result.extractedText?.length || 0
          })
        } else {
          toast.error(result.error || 'Failed to extract text from PDF', { id: ocrToast })
          console.error('[DocumentUpload] PDF OCR failed', result.error)
        }
      } else {
        // For images, convert to base64 and use image OCR endpoint
        console.log('[DocumentUpload] Processing image with /api/ocr/document')

        // Convert file to base64
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const imageData = await base64Promise

        const response = await fetch('/api/ocr/document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData,
            patientId: patientId,
            documentId: document.id
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Text extracted successfully', { id: ocrToast })
          console.log('[DocumentUpload] Image OCR completed', {
            textLength: result.extractedText?.length || 0,
            confidence: result.confidence
          })
        } else {
          toast.error(result.error || 'Failed to extract text from image', { id: ocrToast })
          console.error('[DocumentUpload] Image OCR failed', result.error)
        }
      }
    } catch (error) {
      console.error('[DocumentUpload] Background OCR processing error', error)
      // Don't show error toast here - user already got success for upload
      // OCR failures are logged and status is updated in Firestore
    }
  }

  return (
    <div className="bg-card rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Upload Document</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* File Upload Area */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Select Files
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border rounded-lg p-6 hover:border-primary hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-2">
            <ArrowUpTrayIcon className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Click to select files
            </p>
            <p className="text-xs text-muted-foreground">
              Images or PDF files
            </p>
          </div>
        </button>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Selected Files ({selectedFiles.length})
          </label>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-background rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  {file.type.startsWith('image/') ? (
                    <PhotoIcon className="w-5 h-5 text-primary" />
                  ) : (
                    <DocumentTextIcon className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Document Name *
        </label>
        <input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          disabled={uploading}
          placeholder="e.g., Insurance Card, Lab Results"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          disabled={uploading}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          <option value="insurance_card">Insurance Card</option>
          <option value="id_card">ID Card</option>
          <option value="lab_result">Lab Result</option>
          <option value="prescription">Prescription</option>
          <option value="medical_record">Medical Record</option>
          <option value="imaging">Imaging/X-Ray</option>
          <option value="vaccination_record">Vaccination Record</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={uploading}
          placeholder="Add any additional notes about this document"
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
        />
      </div>

      {/* OCR Progress */}
      {isProcessingOcr && (
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Processing OCR...</span>
            <span className="text-sm text-muted-foreground">{ocrProgress}%</span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0 || !documentName.trim()}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
    </div>
  )
}
