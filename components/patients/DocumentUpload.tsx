'use client'

import { useState, useRef } from 'react'
import { DocumentTextIcon, PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { medicalOperations } from '@/lib/medical-operations'
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
  const [category, setCategory] = useState<DocumentCategory>('insurance_card')
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    setUploading(true)
    const uploadToast = toast.loading('Uploading document...')

    try {
      // Upload files to Firebase Storage
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

      // Create document record
      await medicalOperations.documents.uploadDocument(patientId, {
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

      toast.success('Document uploaded successfully', { id: uploadToast })

      // Reset form
      setSelectedFiles([])
      setDocumentName('')
      setNotes('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onSuccess?.()
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document', { id: uploadToast })
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
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
