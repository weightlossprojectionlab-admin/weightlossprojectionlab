'use client'

import { PatientDocument } from '@/types/medical'
import { ClipboardDocumentIcon, CheckIcon, MagnifyingGlassIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface UnifiedCardViewProps {
  document: PatientDocument
}

export default function UnifiedCardView({ document }: UnifiedCardViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success(`${fieldName} copied!`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

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

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  }

  const resetZoom = () => {
    setZoomLevel(1)
  }

  // Reset zoom when modal closes
  const closeModal = () => {
    setShowImageModal(false)
    setZoomLevel(1)
  }

  const metadata = document.metadata

  // Determine card background based on type
  const hasInsuranceData = metadata?.policyNumber || metadata?.provider
  const hasIdData = metadata?.licenseNumber || metadata?.idNumber

  let bgGradient = 'from-blue-500 to-blue-700' // Insurance
  let borderColor = 'border-blue-300'
  let cardType = 'Insurance Card'

  if (hasIdData) {
    bgGradient = 'from-green-500 to-green-700'
    borderColor = 'border-green-300'
    cardType = 'ID Card'
  } else if (!hasInsuranceData) {
    bgGradient = 'from-purple-500 to-purple-700'
    borderColor = 'border-purple-300'
    cardType = 'Document'
  }

  return (
    <>
      <div className={`bg-gradient-to-br ${bgGradient} rounded-xl shadow-lg border-2 ${borderColor} overflow-hidden`}>
        {/* Card Header */}
        <div className="p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm opacity-90 mb-1">{cardType}</p>
              <h3 className="text-2xl font-bold">
                {metadata?.provider || metadata?.memberName || document.name}
              </h3>
            </div>
            <div className="bg-background/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium">
              {document.category}
            </div>
          </div>
        </div>

        {/* Document Image/Preview with Flip or Carousel */}
        <div className="bg-card border-t-4 border-white/30">
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
                      className="w-full h-auto cursor-pointer"
                      onClick={() => setShowImageModal(true)}
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
                      className="w-full h-auto cursor-pointer"
                      onClick={() => setShowImageModal(true)}
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

                {/* Zoom Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-none"
                  onClick={() => setShowImageModal(true)}
                >
                  <div className="bg-background/90 backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform pointer-events-auto">
                    <MagnifyingGlassIcon className="w-6 h-6 text-foreground" />
                  </div>
                </div>
              </div>
            ) : (
              /* Carousel for Multi-Page or Single Image */
              <div className="relative group">
                <img
                  src={images[currentImageIndex].url}
                  alt={images[currentImageIndex].label || document.name}
                  className="w-full h-auto cursor-pointer"
                  onClick={() => setShowImageModal(true)}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      prevImage()
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      nextImage()
                    }}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex(idx)
                        }}
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

              {/* Zoom Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                onClick={() => setShowImageModal(true)}
              >
                <div className="bg-background/90 backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform">
                  <MagnifyingGlassIcon className="w-6 h-6 text-foreground" />
                </div>
              </div>
            </div>
            )
          ) : (
            <button
              onClick={() => setShowImageModal(true)}
              className="w-full p-8 bg-background hover:bg-muted transition-colors flex flex-col items-center gap-3"
            >
              <DocumentTextIcon className="w-16 h-16 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Tap to view PDF
              </span>
            </button>
          )}
        </div>

      {/* Card Body - Extracted Data */}
      <div className="bg-card p-6 space-y-4">
        {/* Insurance Information */}
        {(metadata?.policyNumber || metadata?.memberName || metadata?.provider || metadata?.groupNumber) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
              Insurance Information
            </h4>

            {metadata?.provider && (
              <DataField
                label="Provider"
                value={metadata.provider}
                onCopy={() => copyToClipboard(metadata.provider!, 'Provider')}
                copied={copiedField === 'Provider'}
              />
            )}

            {metadata?.memberName && (
              <DataField
                label="Member Name"
                value={metadata.memberName}
                onCopy={() => copyToClipboard(metadata.memberName!, 'Member Name')}
                copied={copiedField === 'Member Name'}
              />
            )}

            {metadata?.policyNumber && (
              <DataField
                label="Policy Number"
                value={metadata.policyNumber}
                onCopy={() => copyToClipboard(metadata.policyNumber!, 'Policy Number')}
                copied={copiedField === 'Policy Number'}
                mono
              />
            )}

            {metadata?.groupNumber && (
              <DataField
                label="Group Number"
                value={metadata.groupNumber}
                onCopy={() => copyToClipboard(metadata.groupNumber!, 'Group Number')}
                copied={copiedField === 'Group Number'}
                mono
              />
            )}
          </div>
        )}

        {/* ID Information */}
        {(metadata?.licenseNumber || metadata?.idNumber || metadata?.stateIssued) && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
              ID Information
            </h4>

            {metadata?.licenseNumber && (
              <DataField
                label="License Number"
                value={metadata.licenseNumber}
                onCopy={() => copyToClipboard(metadata.licenseNumber!, 'License Number')}
                copied={copiedField === 'License Number'}
                mono
              />
            )}

            {metadata?.idNumber && (
              <DataField
                label="ID Number"
                value={metadata.idNumber}
                onCopy={() => copyToClipboard(metadata.idNumber!, 'ID Number')}
                copied={copiedField === 'ID Number'}
                mono
              />
            )}

            {metadata?.stateIssued && (
              <DataField
                label="State"
                value={metadata.stateIssued}
                onCopy={() => copyToClipboard(metadata.stateIssued!, 'State')}
                copied={copiedField === 'State'}
              />
            )}
          </div>
        )}

        {/* Additional Details */}
        {(metadata?.dates?.length || metadata?.phoneNumbers?.length || metadata?.addresses?.length || metadata?.names?.length || metadata?.amounts?.length) && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
              Additional Details
            </h4>

            {metadata?.names && metadata.names.length > 0 && (
              <DataField
                label="Names"
                value={metadata.names.join(', ')}
                onCopy={() => copyToClipboard(metadata.names!.join(', '), 'Names')}
                copied={copiedField === 'Names'}
              />
            )}

            {metadata?.dates && metadata.dates.length > 0 && (
              <DataField
                label="Dates"
                value={metadata.dates.join(', ')}
                onCopy={() => copyToClipboard(metadata.dates!.join(', '), 'Dates')}
                copied={copiedField === 'Dates'}
              />
            )}

            {metadata?.phoneNumbers && metadata.phoneNumbers.length > 0 && (
              <DataField
                label="Phone Numbers"
                value={metadata.phoneNumbers.join(', ')}
                onCopy={() => copyToClipboard(metadata.phoneNumbers!.join(', '), 'Phone Numbers')}
                copied={copiedField === 'Phone Numbers'}
              />
            )}

            {metadata?.addresses && metadata.addresses.length > 0 && (
              <DataField
                label="Addresses"
                value={metadata.addresses.join(' • ')}
                onCopy={() => copyToClipboard(metadata.addresses!.join(' • '), 'Addresses')}
                copied={copiedField === 'Addresses'}
              />
            )}

            {metadata?.amounts && metadata.amounts.length > 0 && (
              <DataField
                label="Amounts"
                value={metadata.amounts.join(', ')}
                onCopy={() => copyToClipboard(metadata.amounts!.join(', '), 'Amounts')}
                copied={copiedField === 'Amounts'}
              />
            )}
          </div>
        )}

        {/* Full Extracted Text */}
        {document.extractedText && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
                Full Text
              </h4>
              <button
                onClick={() => copyToClipboard(document.extractedText!, 'Full Text')}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                {copiedField === 'Full Text' ? 'Copied!' : 'Copy All'}
              </button>
            </div>
            <div className="bg-background rounded-lg p-3 max-h-32 overflow-y-auto">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                {document.extractedText}
              </pre>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="pt-4 border-t border-border text-xs text-muted-foreground dark:text-muted-foreground">
          Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
          {metadata?.confidenceScore && (
            <span className="ml-3">
              • Confidence: {Math.round(metadata.confidenceScore * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Full Screen Image/PDF Modal with Carousel */}
    {showImageModal && (
      <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={closeModal}>
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-3 bg-background/10 hover:bg-background/20 backdrop-blur-sm rounded-full text-white transition-colors z-10"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Zoom Controls */}
        {document.fileType === 'image' && (
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                zoomIn()
              }}
              disabled={zoomLevel >= 3}
              className="p-3 bg-background/10 hover:bg-background/20 backdrop-blur-sm rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                zoomOut()
              }}
              disabled={zoomLevel <= 0.5}
              className="p-3 bg-background/10 hover:bg-background/20 backdrop-blur-sm rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  resetZoom()
                }}
                className="p-3 bg-background/10 hover:bg-background/20 backdrop-blur-sm rounded-full text-white transition-colors"
                title="Reset Zoom"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <div className="px-3 py-2 bg-black/70 backdrop-blur-sm rounded-full text-white text-sm font-medium">
              {Math.round(zoomLevel * 100)}%
            </div>
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
          {document.fileType === 'image' ? (
            hasFrontAndBack ? (
              /* Fullscreen 3D Flip for Front/Back Cards */
              <div className="relative max-w-4xl w-full overflow-auto" style={{ perspective: '1500px' }}>
                <div
                  className="relative w-full transition-all duration-600 ease-in-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${isFlipped ? 180 : 0}deg) scale(${zoomLevel})`
                  }}
                >
                  {/* Front Image */}
                  <div style={{ backfaceVisibility: 'hidden' }}>
                    <img
                      src={images[0].url}
                      alt={images[0].label || 'Front'}
                      className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl mx-auto"
                      style={{ transformOrigin: 'center center' }}
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
                      className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl mx-auto"
                      style={{ transformOrigin: 'center center' }}
                    />
                  </div>
                </div>

                {/* Fullscreen Flip Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFlip()
                  }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-background/20 hover:bg-background/30 backdrop-blur-md rounded-full text-white text-lg font-medium transition-all flex items-center gap-3 shadow-2xl border border-white/30"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isFlipped ? 'Show Front' : 'Show Back'}
                </button>

                {/* Image Label */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
                  <p className="text-white font-medium">
                    {isFlipped ? images[1].label || 'Back' : images[0].label || 'Front'}
                  </p>
                </div>
              </div>
            ) : (
              /* Fullscreen Carousel for Multi-Page or Single Image */
              <div className="relative overflow-auto max-w-full max-h-full">
                <img
                  src={images[currentImageIndex].url}
                  alt={images[currentImageIndex].label || document.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-300"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center'
                  }}
                />

                {/* Fullscreen Carousel Controls */}
                {hasMultipleImages && (
                  <>
                    {/* Image Info */}
                    <div className="absolute top-20 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
                      <p className="text-white font-medium">
                        {images[currentImageIndex].label} ({currentImageIndex + 1}/{images.length})
                      </p>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-background/10 hover:bg-background/20 backdrop-blur-sm rounded-full text-white transition-colors"
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-background/10 hover:bg-background/20 backdrop-blur-sm rounded-full text-white transition-colors"
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Thumbnail Strip */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 backdrop-blur-sm p-2 rounded-full">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentImageIndex
                              ? 'border-white scale-110'
                              : 'border-white/30 hover:border-white/60'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.label}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          ) : (
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {document.name}
                </h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={document.originalUrl}
                  className="w-full h-full"
                  title={document.name}
                />
              </div>
              <div className="p-4 border-t border-border bg-background">
                <a
                  href={document.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark font-medium text-sm"
                >
                  Open in new tab →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}

// Helper component for data fields with copy button
function DataField({
  label,
  value,
  onCopy,
  copied,
  mono = false
}: {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between bg-background rounded-lg p-3 hover:bg-muted transition-colors group">
      <div className="flex-1 min-w-0 mr-3">
        <dt className="text-xs text-muted-foreground dark:text-muted-foreground mb-0.5">{label}</dt>
        <dd className={`text-sm font-medium text-foreground break-words ${mono ? 'font-mono' : ''}`}>
          {value}
        </dd>
      </div>
      <button
        onClick={onCopy}
        className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary hover:bg-background dark:hover:bg-gray-600 rounded-md transition-all opacity-0 group-hover:opacity-100"
        title={`Copy ${label}`}
      >
        {copied ? (
          <CheckIcon className="w-4 h-4 text-success" />
        ) : (
          <ClipboardDocumentIcon className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
