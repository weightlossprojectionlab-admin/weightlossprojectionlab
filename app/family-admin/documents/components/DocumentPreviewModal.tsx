/**
 * Document Preview Modal
 *
 * Modal for previewing documents without navigating away
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, DocumentMagnifyingGlassIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { getCSRFToken, initCSRFProtection } from '@/lib/csrf'

import { getCSRFToken } from '@/lib/csrf'
interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  document: any
  onDownload: () => void
  onOcrComplete?: () => void
  onEmail?: () => void
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  onDownload,
  onOcrComplete,
  onEmail
}: DocumentPreviewModalProps) {
  const { user } = useAuth()
  const [zoom, setZoom] = useState(100)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Initialize CSRF protection when modal opens
  useEffect(() => {
    if (isOpen) {
      // Force rotate CSRF token to ensure fresh cookie with correct SameSite settings
      const { rotateCSRFToken } = require('@/lib/csrf')
      rotateCSRFToken()
      console.log('[Modal] CSRF token rotated on modal open')
    }
  }, [isOpen])

  if (!isOpen || !document) return null

  const isPdf = document.fileName?.toLowerCase().endsWith('.pdf') ||
                document.contentType === 'application/pdf'
  const isImage = document.contentType?.startsWith('image/') ||
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(document.fileName || '')

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleResetZoom = () => {
    setZoom(100)
  }

  const handleProcessOcr = async () => {
    if (!document.patientId || !document.id || !user) {
      toast.error('Invalid document')
      return
    }

    setIsProcessingOcr(true)
    try {
      const token = await user.getIdToken()
      const csrfToken = getCSRFToken()

      console.log('[OCR] CSRF Debug:', {
        hasCsrfToken: !!csrfToken,
        csrfToken: csrfToken,
        csrfLength: csrfToken?.length,
        allCookies: typeof document !== 'undefined' ? document.cookie : 'no document',
        sessionStorageToken: typeof window !== 'undefined' && window.sessionStorage ? sessionStorage.getItem('csrf-token') : 'no sessionStorage'
      })

      if (!csrfToken) {
        throw new Error('No CSRF token available - please refresh the page')
      }

      const response = await fetch(`/api/patients/${document.patientId}/documents/${document.id}/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': csrfToken
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process OCR')
      }

      if (result.success) {
        toast.success('OCR processing started! This may take a few moments.')
        if (onOcrComplete) {
          onOcrComplete()
        }
      } else {
        throw new Error(result.error || 'Failed to process OCR')
      }
    } catch (error: any) {
      console.error('OCR error:', error)
      toast.error(error.message || 'Failed to process OCR')
    } finally {
      setIsProcessingOcr(false)
    }
  }

  const canProcessOcr = (isPdf || isImage) && document.ocrStatus !== 'completed' && document.ocrStatus !== 'processing'

  const handleSendEmail = async () => {
    if (!emailAddress.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailAddress)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!user) {
      toast.error('You must be logged in')
      return
    }

    setIsSendingEmail(true)
    try {
      const token = await user.getIdToken()
      const csrfToken = getCSRFToken()

      const response = await fetch(`/api/patients/${document.patientId}/documents/${document.id}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          email: emailAddress,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      if (result.success) {
        toast.success(`Document sent to ${emailAddress}`)
        setShowEmailModal(false)
        setEmailAddress('')
        if (onEmail) {
          onEmail()
        }
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error: any) {
      console.error('Email error:', error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-card rounded-lg shadow-xl max-w-6xl w-full h-[90vh] border-2 border-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{document.name}</h2>
              <p className="text-sm text-muted-foreground">
                {document.patientName} • {document.fileName}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {isImage && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
                    title="Zoom Out"
                    disabled={zoom <= 50}
                  >
                    <MagnifyingGlassMinusIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-3 py-1 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                    title="Reset Zoom"
                  >
                    {zoom}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
                    title="Zoom In"
                    disabled={zoom >= 300}
                  >
                    <MagnifyingGlassPlusIcon className="w-5 h-5" />
                  </button>
                </>
              )}
              {canProcessOcr && (
                <button
                  onClick={handleProcessOcr}
                  disabled={isProcessingOcr}
                  className="p-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Process OCR"
                >
                  {isProcessingOcr ? (
                    <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <DocumentMagnifyingGlassIcon className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={() => setShowEmailModal(true)}
                className="p-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
                title="Email Document"
              >
                <EnvelopeIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onDownload}
                className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors"
                title="Download"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-secondary/20 p-4">
            {isPdf ? (
              <iframe
                src={document.originalUrl}
                className="w-full h-full rounded-lg bg-white"
                title={document.name}
              />
            ) : isImage ? (
              <div className="flex items-center justify-center h-full overflow-auto">
                <img
                  src={document.originalUrl}
                  alt={document.name}
                  className="rounded-lg transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center',
                    maxWidth: zoom > 100 ? 'none' : '100%',
                    maxHeight: zoom > 100 ? 'none' : '100%',
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <button
                  onClick={onDownload}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download to View
                </button>
              </div>
            )}
          </div>

          {/* Footer with metadata */}
          {document.ocrStatus === 'completed' && document.extractedText && (
            <div className="border-t border-border p-4 bg-secondary/10">
              <p className="text-xs font-semibold text-foreground mb-2">Extracted Text:</p>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {document.extractedText}
              </p>
            </div>
          )}
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border-2 border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">Email Document</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send "{document.name}" to an email address
              </p>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground mb-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendEmail()
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEmailModal(false)
                    setEmailAddress('')
                  }}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary-dark transition-colors"
                  disabled={isSendingEmail}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
