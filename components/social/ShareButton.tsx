'use client'

import { useState } from 'react'
import { share, isWebShareSupported, type ShareOptions } from '@/lib/social-share-utils'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

export interface ShareButtonProps {
  shareOptions: ShareOptions
  variant?: 'default' | 'icon' | 'text'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onShareModalOpen?: () => void
}

/**
 * Share button with Web Share API support and fallback modal
 */
export function ShareButton({
  shareOptions,
  variant = 'default',
  size = 'md',
  className = '',
  onShareModalOpen
}: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    setSharing(true)

    try {
      const result = await share(shareOptions)

      if (result.method === 'web-api') {
        if (result.success) {
          toast.success('Shared successfully!')
        }
        // If not successful, user likely cancelled - no error toast needed
      } else if (result.method === 'platform-links') {
        // Open share modal for platform selection
        onShareModalOpen?.()
      }
    } catch (error) {
      logger.error('Share error:', error as Error)
      toast.error('Failed to share')
    } finally {
      setSharing(false)
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  // Icon size classes
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  // Variant styles
  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        disabled={sharing}
        className={`p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label="Share"
      >
        {sharing ? (
          <div className={`animate-spin rounded-full border-2 border-border border-t-primary ${iconSizes[size]}`} />
        ) : (
          <svg className={`${iconSizes[size]} text-muted-foreground`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>
    )
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleShare}
        disabled={sharing}
        className={`text-primary hover:text-primary-hover font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 ${className}`}
      >
        {sharing ? (
          <>
            <div className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${iconSizes[size]}`} />
            <span>Sharing...</span>
          </>
        ) : (
          <>
            <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </>
        )}
      </button>
    )
  }

  // Default button variant
  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={`${sizeClasses[size]} bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {sharing ? (
        <>
          <div className={`animate-spin rounded-full border-2 border-white border-t-transparent ${iconSizes[size]}`} />
          <span>Sharing...</span>
        </>
      ) : (
        <>
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  )
}
