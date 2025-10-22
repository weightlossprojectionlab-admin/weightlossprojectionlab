'use client'

import { useEffect, useState } from 'react'
import {
  generateShareContent,
  getPlatformShareUrls,
  copyToClipboard,
  SHARE_PLATFORMS,
  type ShareOptions
} from '@/lib/social-share-utils'
import toast from 'react-hot-toast'

export interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareOptions: ShareOptions
}

/**
 * Modal for sharing on specific platforms (desktop fallback)
 */
export function ShareModal({ isOpen, onClose, shareOptions }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const content = generateShareContent(shareOptions)
  const platformUrls = getPlatformShareUrls(content)

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

  const handleCopyLink = async () => {
    const success = await copyToClipboard(content.url || window.location.href)
    if (success) {
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 3000)
    } else {
      toast.error('Failed to copy link')
    }
  }

  const handlePlatformClick = (platformId: string) => {
    const url = platformUrls[platformId as keyof typeof platformUrls]
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Share</h3>
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

        {/* Preview */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{content.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{content.text}</p>
        </div>

        {/* Platform Grid */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Share on</p>
          <div className="grid grid-cols-4 gap-3">
            {SHARE_PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handlePlatformClick(platform.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg ${platform.color} text-white transition-colors`}
                title={`Share on ${platform.name}`}
              >
                <span className="text-2xl">{platform.icon}</span>
                <span className="text-xs font-medium">{platform.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Copy Link */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or copy link</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={content.url || window.location.href}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                copied
                  ? 'bg-success text-white'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </span>
              ) : (
                'Copy'
              )}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Sharing helps friends discover Weight Loss Project Lab! 🚀
        </p>
      </div>
    </div>
  )
}
