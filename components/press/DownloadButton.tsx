/**
 * Download Button Component
 * Reusable button for tracking and initiating press asset downloads
 */

'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface DownloadButtonProps {
  assetId: string
  assetUrl: string
  label: string
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  trackDownload?: boolean
}

export function DownloadButton({
  assetId,
  assetUrl,
  label,
  variant = 'primary',
  className = '',
  trackDownload = true,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)

      // Track download if enabled
      if (trackDownload) {
        try {
          await fetch('/api/press/downloads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ asset: assetId }),
          })
        } catch (trackError) {
          console.error('Download tracking error:', trackError)
          // Continue with download even if tracking fails
        }
      }

      // Create a temporary link to trigger download
      const link = document.createElement('a')
      link.href = assetUrl
      link.download = assetUrl.split('/').pop() || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Download started successfully!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to start download. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  const baseStyles = 'font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300',
    ghost: 'text-gray-600 hover:text-gray-700',
  }

  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${className}`

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={buttonStyles}
      aria-label={label}
    >
      {isDownloading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Downloading...
        </span>
      ) : (
        label
      )}
    </button>
  )
}
