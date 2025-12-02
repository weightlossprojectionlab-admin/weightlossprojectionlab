'use client'

/**
 * Report Issue Modal
 *
 * Modal for reporting issues with delivered items
 * Features:
 * - Issue type selector (missing, damaged, wrong item, expired, quality)
 * - Description textarea
 * - Required photo upload for evidence
 * - Photo preview
 * - Validation before submission
 */

import { useState, useRef } from 'react'
import {
  XMarkIcon,
  CameraIcon,
  PhotoIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ReportIssueModalProps {
  isOpen: boolean
  onClose: () => void
  item: any
  onSubmit: (issue: {
    issueType: 'missing' | 'damaged' | 'wrong_item' | 'expired' | 'quality_issue'
    description: string
    photoBase64: string
  }) => Promise<void>
}

export function ReportIssueModal({
  isOpen,
  onClose,
  item,
  onSubmit
}: ReportIssueModalProps) {
  const [issueType, setIssueType] = useState<'missing' | 'damaged' | 'wrong_item' | 'expired' | 'quality_issue'>('damaged')
  const [description, setDescription] = useState('')
  const [photoBase64, setPhotoBase64] = useState<string>('')
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Issue type options
  const issueTypes = [
    { value: 'missing', label: 'Missing Item', description: 'Item was not delivered' },
    { value: 'damaged', label: 'Damaged', description: 'Item is broken or damaged' },
    { value: 'wrong_item', label: 'Wrong Item', description: 'Received incorrect item' },
    { value: 'expired', label: 'Expired', description: 'Item is past expiration date' },
    { value: 'quality_issue', label: 'Quality Issue', description: 'Item quality is poor (bruised, spoiled, etc.)' }
  ] as const

  // Handle photo selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setError('')

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setPhotoBase64(base64)
      setPhotoPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  // Trigger photo upload
  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      // Create video element to capture photo
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      // Wait for video to load
      await new Promise(resolve => {
        video.onloadedmetadata = resolve
      })

      // Create canvas to capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)

      // Stop video stream
      stream.getTracks().forEach(track => track.stop())

      // Convert to base64
      const base64 = canvas.toDataURL('image/jpeg', 0.8)
      setPhotoBase64(base64)
      setPhotoPreview(base64)
      setError('')
    } catch (error) {
      console.error('[ReportIssueModal] Camera access error:', error)
      setError('Unable to access camera. Please upload a photo instead.')
    }
  }

  // Remove photo
  const handleRemovePhoto = () => {
    setPhotoBase64('')
    setPhotoPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Validate and submit
  const handleSubmit = async () => {
    // Validation
    if (!issueType) {
      setError('Please select an issue type')
      return
    }

    if (!description.trim()) {
      setError('Please provide a description')
      return
    }

    if (!photoBase64) {
      setError('Photo evidence is required for all claims')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onSubmit({
        issueType,
        description: description.trim(),
        photoBase64
      })

      // Reset form
      setIssueType('damaged')
      setDescription('')
      setPhotoBase64('')
      setPhotoPreview('')
      onClose()
    } catch (error: any) {
      console.error('[ReportIssueModal] Submit error:', error)
      setError(error.message || 'Failed to submit issue report')
    } finally {
      setLoading(false)
    }
  }

  // Reset form on close
  const handleClose = () => {
    if (!loading) {
      setIssueType('damaged')
      setDescription('')
      setPhotoBase64('')
      setPhotoPreview('')
      setError('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground dark:text-white">
              Report Issue
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {item?.productName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Issue Type Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-white mb-3">
              What's the issue?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {issueTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setIssueType(type.value)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    issueType === type.value
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-border hover:border-primary/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-semibold text-foreground dark:text-white mb-1">
                    {type.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-white mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="Please describe the issue in detail..."
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border dark:border-gray-600 rounded-lg text-foreground dark:text-white placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-white mb-2">
              Photo Evidence <span className="text-error">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Photo evidence is required for all issue reports. Please clearly show the problem.
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoPreview ? (
              /* Photo Preview */
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Issue photo"
                  className="w-full h-64 object-cover rounded-lg border-2 border-border"
                />
                <button
                  onClick={handleRemovePhoto}
                  disabled={loading}
                  className="absolute top-2 right-2 p-2 bg-error text-white rounded-lg hover:bg-error-dark transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              /* Upload Buttons */
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCameraCapture}
                  disabled={loading}
                  className="p-6 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CameraIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground dark:text-white">
                    Take Photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use camera
                  </p>
                </button>

                <button
                  onClick={handlePhotoClick}
                  disabled={loading}
                  className="p-6 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhotoIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground dark:text-white">
                    Upload Photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From gallery
                  </p>
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error-light dark:bg-red-900/20 border border-error rounded-lg p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Important Information
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Photo evidence is required for all claims</li>
              <li>• Claims under $20 are auto-approved with valid evidence</li>
              <li>• Missing item claims require manual review</li>
              <li>• Refunds are processed within 2-3 business days</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 border border-border rounded-lg font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !photoBase64}
              className="px-6 py-2 bg-error text-white rounded-lg font-medium hover:bg-error-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
