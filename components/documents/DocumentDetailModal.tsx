'use client'

import { PatientDocument } from '@/types/medical'
import { XMarkIcon, DocumentTextIcon, CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface DocumentDetailModalProps {
  document: PatientDocument
  onClose: () => void
}

export default function DocumentDetailModal({ document, onClose }: DocumentDetailModalProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {document.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {document.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {hasOcrData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Original Document */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  Original Document
                </h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
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
                                      ? 'bg-white w-4'
                                      : 'bg-white/50 hover:bg-white/75'
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
                      <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <a
                        href={document.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Open PDF in new tab
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Extracted Data */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  Extracted Information
                </h3>

                {/* Metadata Cards */}
                {document.metadata && Object.keys(document.metadata).length > 0 && (
                  <div className="space-y-4 mb-6">
                    {/* Insurance Card Data */}
                    {(document.metadata.policyNumber || document.metadata.memberName || document.metadata.provider) && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                          Insurance Information
                        </h4>
                        <dl className="space-y-2 text-sm">
                          {document.metadata.provider && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Provider</dt>
                              <dd className="text-blue-900 dark:text-blue-100">{document.metadata.provider}</dd>
                            </div>
                          )}
                          {document.metadata.memberName && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Member Name</dt>
                              <dd className="text-blue-900 dark:text-blue-100">{document.metadata.memberName}</dd>
                            </div>
                          )}
                          {document.metadata.policyNumber && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Policy Number</dt>
                              <dd className="text-blue-900 dark:text-blue-100 font-mono">{document.metadata.policyNumber}</dd>
                            </div>
                          )}
                          {document.metadata.groupNumber && (
                            <div>
                              <dt className="text-blue-700 dark:text-blue-300 font-medium">Group Number</dt>
                              <dd className="text-blue-900 dark:text-blue-100 font-mono">{document.metadata.groupNumber}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}

                    {/* ID Card Data */}
                    {(document.metadata.licenseNumber || document.metadata.idNumber) && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                          ID Information
                        </h4>
                        <dl className="space-y-2 text-sm">
                          {document.metadata.licenseNumber && (
                            <div>
                              <dt className="text-green-700 dark:text-green-300 font-medium">License Number</dt>
                              <dd className="text-green-900 dark:text-green-100 font-mono">{document.metadata.licenseNumber}</dd>
                            </div>
                          )}
                          {document.metadata.idNumber && (
                            <div>
                              <dt className="text-green-700 dark:text-green-300 font-medium">ID Number</dt>
                              <dd className="text-green-900 dark:text-green-100 font-mono">{document.metadata.idNumber}</dd>
                            </div>
                          )}
                          {document.metadata.stateIssued && (
                            <div>
                              <dt className="text-green-700 dark:text-green-300 font-medium">State</dt>
                              <dd className="text-green-900 dark:text-green-100">{document.metadata.stateIssued}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}

                    {/* Generic Data */}
                    {(document.metadata.dates || document.metadata.phoneNumbers || document.metadata.addresses) && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
                          Additional Details
                        </h4>
                        <dl className="space-y-2 text-sm">
                          {document.metadata.dates && document.metadata.dates.length > 0 && (
                            <div>
                              <dt className="text-purple-700 dark:text-purple-300 font-medium">Dates</dt>
                              <dd className="text-purple-900 dark:text-purple-100">
                                {document.metadata.dates.join(', ')}
                              </dd>
                            </div>
                          )}
                          {document.metadata.phoneNumbers && document.metadata.phoneNumbers.length > 0 && (
                            <div>
                              <dt className="text-purple-700 dark:text-purple-300 font-medium">Phone Numbers</dt>
                              <dd className="text-purple-900 dark:text-purple-100">
                                {document.metadata.phoneNumbers.join(', ')}
                              </dd>
                            </div>
                          )}
                          {document.metadata.addresses && document.metadata.addresses.length > 0 && (
                            <div>
                              <dt className="text-purple-700 dark:text-purple-300 font-medium">Addresses</dt>
                              <dd className="text-purple-900 dark:text-purple-100">
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
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Full Extracted Text
                  </h4>
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {document.extractedText}
                  </pre>
                </div>

                {/* Confidence Score */}
                {document.metadata?.confidenceScore && (
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Extraction confidence: {Math.round(document.metadata.confidenceScore * 100)}%
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {document.ocrStatus === 'processing' ? 'Processing Document...' : 'No OCR Data Available'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {document.ocrStatus === 'processing'
                  ? 'Text extraction is in progress. This usually takes a few seconds.'
                  : 'OCR processing has not been completed for this document.'}
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden max-w-2xl mx-auto">
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
                                    ? 'bg-white w-4'
                                    : 'bg-white/50 hover:bg-white/75'
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
                      className="text-purple-600 hover:text-purple-700 font-medium"
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
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {new Date(document.uploadedAt).toLocaleDateString()}
            </div>
            <div>{(document.fileSize / 1024).toFixed(0)} KB</div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={document.originalUrl}
              download={document.fileName}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Download Original
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
