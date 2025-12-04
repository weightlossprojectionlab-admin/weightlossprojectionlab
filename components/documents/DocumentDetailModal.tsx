'use client'

import { PatientDocument } from '@/types/medical'
import { XMarkIcon, DocumentTextIcon, CalendarIcon, CheckCircleIcon, TrashIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface DocumentDetailModalProps {
  document: PatientDocument
  onClose: () => void
  onDelete?: () => void
  canDelete?: boolean
}

export default function DocumentDetailModal({ document: initialDocument, onClose, onDelete, canDelete = false }: DocumentDetailModalProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [document, setDocument] = useState(initialDocument)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Real-time listener for document updates (especially OCR status)
  useEffect(() => {
    if (!document.patientId || !document.userId) return

    const user = auth.currentUser
    if (!user) return

    const docRef = doc(
      db,
      'users',
      document.userId,
      'patients',
      document.patientId,
      'documents',
      document.id
    )

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const updatedDoc = {
          id: snapshot.id,
          ...snapshot.data()
        } as PatientDocument

        setDocument(updatedDoc)

        // Show toast when OCR completes
        if (
          initialDocument.ocrStatus === 'pending' &&
          updatedDoc.ocrStatus === 'completed'
        ) {
          toast.success('Text extraction completed!')
        } else if (
          initialDocument.ocrStatus === 'pending' &&
          updatedDoc.ocrStatus === 'failed'
        ) {
          toast.error('Text extraction failed')
        }
      }
    })

    return () => unsubscribe()
  }, [document.patientId, document.userId, document.id, initialDocument.ocrStatus])

  const handleDelete = async () => {
    if (!document.patientId) return

    try {
      setDeleting(true)
      await medicalOperations.documents.deleteDocument(document.patientId, document.id)
      toast.success('Document deleted successfully')
      onDelete?.()
      onClose()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleEmailDocument = async () => {
    if (!emailRecipient.trim()) {
      toast.error('Please enter a recipient email address')
      return
    }

    if (!emailRecipient.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      setSendingEmail(true)

      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()

      // For simplicity, we'll create a basic text document with the extracted text
      // and send it via the send-report endpoint
      const today = new Date().toISOString().split('T')[0]

      // Create a simple body that includes the document information
      const emailBody = `Document: ${document.name}
Category: ${document.category}
Upload Date: ${new Date(document.uploadedAt).toLocaleDateString()}

${emailMessage ? `Message:\n${emailMessage}\n\n` : ''}
${document.extractedText ? `Extracted Text:\n${document.extractedText}\n\n` : ''}

Original Document URL: ${document.originalUrl}

This document was sent from Weight Loss Projection Lab.`

      // Note: This is a simplified version. In production, you might want to create
      // a dedicated endpoint for emailing individual documents
      const response = await fetch(`/api/patients/${document.patientId}/send-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientEmail: emailRecipient,
          reportDate: today,
          template: 'records_request',
          customMessage: emailBody,
          patientName: 'Patient',
          senderName: user.displayName || user.email || 'User',
          attachments: []
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send email')
      }

      toast.success('Document emailed successfully!')
      setShowEmailModal(false)
      setEmailRecipient('')
      setEmailMessage('')
    } catch (error: any) {
      console.error('Error emailing document:', error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const hasOcrData = document.ocrStatus === 'completed' && document.extractedText

  // Get all images (support both new multi-image and legacy single-image)
  const images = document.images && document.images.length > 0
    ? document.images
    : [{ url: document.originalUrl, label: 'Document', position: 0 }]

  const hasMultipleImages = images.length > 1

  // Check if this is a 2-sided card (front/back)
  const hasFrontAndBack = images.length === 2 &&
    images.some(img => img.label?.toLowerCase().includes('front')) &&
    images.some(img => img.label?.toLowerCase().includes('back'))

  const toggleFlip = () => {
    setIsFlipped(prev => !prev)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const openLightbox = (imageUrl: string) => {
    setLightboxImageUrl(imageUrl)
    setShowLightbox(true)
  }

  const closeLightbox = () => {
    setShowLightbox(false)
    setLightboxImageUrl('')
  }

  return (
    <>
      {/* Lightbox for Full-Screen Image */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={closeLightbox}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Full size document"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-4 text-sm">Click outside image to close</p>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {document.name}
              </h2>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                {document.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                title="Delete document"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {hasOcrData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Original Document */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  Original Document
                </h3>
                <div className="bg-muted rounded-lg overflow-hidden">
                  {document.fileType === 'image' ? (
                    hasFrontAndBack ? (
                      /* 3D Flip Animation for Front/Back Cards */
                      <div className="relative group" style={{ perspective: '1000px' }}>
                        <div
                          className="relative w-full transition-transform duration-600 ease-in-out"
                          style={{
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                          }}
                        >
                          {/* Front Image */}
                          <div style={{ backfaceVisibility: 'hidden' }}>
                            <img
                              src={images[0].url}
                              alt={images[0].label || 'Front'}
                              className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openLightbox(images[0].url)}
                            />
                          </div>

                          {/* Back Image */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)'
                            }}
                          >
                            <img
                              src={images[1].url}
                              alt={images[1].label || 'Back'}
                              className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openLightbox(images[1].url)}
                            />
                          </div>
                        </div>

                        {/* Zoom Icon Hint */}
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                          </svg>
                        </div>

                        {/* Flip Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFlip()
                          }}
                          className="absolute bottom-3 right-3 px-4 py-2 bg-black/70 hover:bg-black/85 backdrop-blur-sm rounded-full text-white text-sm font-medium transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {isFlipped ? 'Show Front' : 'Show Back'}
                        </button>
                      </div>
                    ) : (
                      /* Carousel for Multi-Page or Single Image */
                      <div className="relative group">
                        <img
                          src={images[currentImageIndex].url}
                          alt={images[currentImageIndex].label || document.name}
                          className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openLightbox(images[currentImageIndex].url)}
                        />

                        {/* Zoom Icon Hint */}
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                          </svg>
                        </div>

                        {/* Image Label */}
                        {hasMultipleImages && (
                          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full">
                            <p className="text-white text-xs font-medium">
                              {images[currentImageIndex].label} ({currentImageIndex + 1}/{images.length})
                            </p>
                          </div>
                        )}

                        {/* Carousel Controls */}
                        {hasMultipleImages && !hasFrontAndBack && (
                          <>
                            <button
                              onClick={prevImage}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={nextImage}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>

                            {/* Dot Indicators */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {images.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentImageIndex(idx)}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    idx === currentImageIndex
                                      ? 'bg-background w-4'
                                      : 'bg-background/50 hover:bg-background/75'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center">
                      <DocumentTextIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <a
                        href={document.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-dark font-medium"
                      >
                        Open PDF in new tab
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Extracted Data */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-success" />
                  Extracted Information
                </h3>

                {/* Metadata Cards */}
                {document.metadata && Object.keys(document.metadata).length > 0 && (
                  <div className="space-y-4 mb-6">
                    {/* Insurance Card Data */}
                    {(document.metadata.policyNumber || document.metadata.memberName || document.metadata.provider) && (
                      <div className="bg-secondary-light border border-secondary-light rounded-lg p-4">
                        <h4 className="font-semibold text-secondary-dark mb-3">
                          Insurance Information
                        </h4>
                        <dl className="space-y-2 text-sm">
                          {document.metadata.provider && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Provider</dt>
                              <dd className="text-secondary-dark">{document.metadata.provider}</dd>
                            </div>
                          )}
                          {document.metadata.memberName && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Member Name</dt>
                              <dd className="text-secondary-dark">{document.metadata.memberName}</dd>
                            </div>
                          )}
                          {document.metadata.policyNumber && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Policy Number</dt>
                              <dd className="text-secondary-dark font-mono">{document.metadata.policyNumber}</dd>
                            </div>
                          )}
                          {document.metadata.groupNumber && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Group Number</dt>
                              <dd className="text-secondary-dark font-mono">{document.metadata.groupNumber}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}

                    {/* ID Card Data */}
                    {(document.metadata.licenseNumber || document.metadata.idNumber) && (
                      <div className="bg-success-light dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                          ID Information
                        </h4>
                        <dl className="space-y-2 text-sm">
                          {document.metadata.licenseNumber && (
                            <div>
                              <dt className="text-success-dark dark:text-green-300 font-medium">License Number</dt>
                              <dd className="text-green-900 dark:text-green-100 font-mono">{document.metadata.licenseNumber}</dd>
                            </div>
                          )}
                          {document.metadata.idNumber && (
                            <div>
                              <dt className="text-success-dark dark:text-green-300 font-medium">ID Number</dt>
                              <dd className="text-green-900 dark:text-green-100 font-mono">{document.metadata.idNumber}</dd>
                            </div>
                          )}
                          {document.metadata.stateIssued && (
                            <div>
                              <dt className="text-success-dark dark:text-green-300 font-medium">State</dt>
                              <dd className="text-green-900 dark:text-green-100">{document.metadata.stateIssued}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}

                    {/* Generic Data */}
                    {(document.metadata.dates || document.metadata.phoneNumbers || document.metadata.addresses) && (
                      <div className="bg-primary-light border border-primary-light rounded-lg p-4">
                        <h4 className="font-semibold text-primary-dark mb-3">
                          Additional Details
                        </h4>
                        <dl className="space-y-2 text-sm">
                          {document.metadata.dates && document.metadata.dates.length > 0 && (
                            <div>
                              <dt className="text-primary-dark font-medium">Dates</dt>
                              <dd className="text-primary-dark">
                                {document.metadata.dates.join(', ')}
                              </dd>
                            </div>
                          )}
                          {document.metadata.phoneNumbers && document.metadata.phoneNumbers.length > 0 && (
                            <div>
                              <dt className="text-primary-dark font-medium">Phone Numbers</dt>
                              <dd className="text-primary-dark">
                                {document.metadata.phoneNumbers.join(', ')}
                              </dd>
                            </div>
                          )}
                          {document.metadata.addresses && document.metadata.addresses.length > 0 && (
                            <div>
                              <dt className="text-primary-dark font-medium">Addresses</dt>
                              <dd className="text-primary-dark">
                                {document.metadata.addresses.join(' • ')}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Extracted Text */}
                <div className="bg-background border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3">
                    Full Extracted Text
                  </h4>
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                    {document.extractedText}
                  </pre>
                </div>

                {/* Confidence Score */}
                {document.metadata?.confidenceScore && (
                  <div className="mt-4 text-sm text-muted-foreground dark:text-muted-foreground">
                    Extraction confidence: {Math.round(document.metadata.confidenceScore * 100)}%
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              {document.ocrStatus === 'processing' ? (
                <>
                  {/* Animated spinner */}
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Processing Document...
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Extracting text from your {document.fileType === 'pdf' ? 'PDF' : 'document'}. This usually takes 5-10 seconds.
                    <br />
                    <span className="text-sm">Please wait, this page will update automatically...</span>
                  </p>
                </>
              ) : (
                <>
                  <DocumentTextIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No OCR Data Available
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {document.fileType === 'pdf'
                      ? 'PDF text extraction failed or did not complete. You can download the original PDF below to view it.'
                      : 'OCR processing has not been completed for this document.'}
                  </p>
                </>
              )}
              <div className="bg-muted rounded-lg overflow-hidden max-w-2xl mx-auto">
                {document.fileType === 'image' ? (
                  hasFrontAndBack ? (
                    /* 3D Flip Animation for Front/Back Cards */
                    <div className="relative group" style={{ perspective: '1000px' }}>
                      <div
                        className="relative w-full transition-transform duration-600 ease-in-out"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                        }}
                      >
                        {/* Front Image */}
                        <div style={{ backfaceVisibility: 'hidden' }}>
                          <img
                            src={images[0].url}
                            alt={images[0].label || 'Front'}
                            className="w-full h-auto"
                          />
                        </div>

                        {/* Back Image */}
                        <div
                          className="absolute inset-0"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                          }}
                        >
                          <img
                            src={images[1].url}
                            alt={images[1].label || 'Back'}
                            className="w-full h-auto"
                          />
                        </div>
                      </div>

                      {/* Flip Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFlip()
                        }}
                        className="absolute bottom-3 right-3 px-4 py-2 bg-black/70 hover:bg-black/85 backdrop-blur-sm rounded-full text-white text-sm font-medium transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isFlipped ? 'Show Front' : 'Show Back'}
                      </button>
                    </div>
                  ) : (
                    /* Carousel for Multi-Page or Single Image */
                    <div className="relative group">
                      <img
                        src={images[currentImageIndex].url}
                        alt={images[currentImageIndex].label || document.name}
                        className="w-full h-auto"
                      />

                      {/* Image Label */}
                      {hasMultipleImages && (
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full">
                          <p className="text-white text-xs font-medium">
                            {images[currentImageIndex].label} ({currentImageIndex + 1}/{images.length})
                          </p>
                        </div>
                      )}

                      {/* Carousel Controls */}
                      {hasMultipleImages && !hasFrontAndBack && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>

                          {/* Dot Indicators */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {images.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  idx === currentImageIndex
                                    ? 'bg-background w-4'
                                    : 'bg-background/50 hover:bg-background/75'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                ) : (
                  <div className="p-8">
                    <a
                      href={document.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Open document in new tab
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-background">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {new Date(document.uploadedAt).toLocaleDateString()}
            </div>
            {document.fileSize && (
              <div>{(document.fileSize / 1024).toFixed(0)} KB</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors flex items-center gap-2"
            >
              <EnvelopeIcon className="w-4 h-4" />
              Email
            </button>
            <a
              href={document.originalUrl}
              download={document.fileName}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              onClick={(e) => {
                // For Firebase Storage URLs, open in new tab instead of download
                if (document.originalUrl.includes('firebasestorage')) {
                  e.preventDefault()
                  window.open(document.originalUrl, '_blank')
                }
              }}
            >
              Download Original
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Document"
          message={`Are you sure you want to delete "${document.name}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}

      {/* Email Document Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <EnvelopeIcon className="w-5 h-5 text-secondary" />
                  Email Document
                </h3>
                <button
                  onClick={() => {
                    setShowEmailModal(false)
                    setEmailRecipient('')
                    setEmailMessage('')
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Send "{document.name}" to a healthcare provider or contact
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="doctor@example.com"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={sendingEmail}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Optional Message
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Add a personal message (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    disabled={sendingEmail}
                  />
                </div>

                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>What will be sent:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 space-y-1">
                    <li>Document name and category</li>
                    {document.extractedText && <li>Extracted text from document</li>}
                    <li>Link to view original document</li>
                  </ul>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleEmailDocument}
                    disabled={sendingEmail || !emailRecipient.trim()}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="w-4 h-4" />
                        Send Email
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailModal(false)
                      setEmailRecipient('')
                      setEmailMessage('')
                    }}
                    disabled={sendingEmail}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
