'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

export interface SharePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageBlob: Blob
  caption: string
  onDownload: () => void
  onShare?: (platform: 'facebook' | 'twitter' | 'instagram' | 'tiktok' | 'pinterest') => void
}

/**
 * Preview modal for social media share card
 * Shows the generated image and caption before downloading/sharing
 */
export function SharePreviewModal({
  isOpen,
  onClose,
  imageBlob,
  caption,
  onDownload,
  onShare
}: SharePreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Create object URL for blob preview
  useEffect(() => {
    if (isOpen && imageBlob) {
      const url = URL.createObjectURL(imageBlob)
      setImageUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [isOpen, imageBlob])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setCopied(false)
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleCopyCaption = async () => {
    if (!navigator.clipboard) {
      logger.warn('Clipboard API not supported')
      return
    }

    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      logger.error('Failed to copy caption', error as Error)
    }
  }

  if (!isOpen) return null

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-black' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
    { id: 'twitter', name: 'X', icon: '𝕏', color: 'bg-black' },
    { id: 'pinterest', name: 'Pinterest', icon: '📍', color: 'bg-red-600' }
  ] as const

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Share Preview</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image Preview */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preview (9:16 format)</p>
            {imageUrl && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex justify-center">
                <img
                  src={imageUrl}
                  alt="Share preview"
                  className="max-h-[500px] w-auto object-contain"
                />
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Caption</p>
              <button
                onClick={handleCopyCaption}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy Caption'}
              </button>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{caption}</p>
            </div>
          </div>

          {/* Platform Selection */}
          {onShare && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Share</p>
              <div className="grid grid-cols-5 gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => onShare(platform.id as any)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg ${platform.color} text-white transition-transform hover:scale-105`}
                    title={`Share to ${platform.name}`}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="text-xs font-medium">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Download Button */}
          <div className="flex gap-3">
            <button
              onClick={onDownload}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Image
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
            For Instagram & TikTok: Download the image, copy the caption, and paste when posting
          </p>
        </div>
      </div>
    </div>
  )
}
