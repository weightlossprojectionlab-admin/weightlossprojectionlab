'use client'

import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useEffect } from 'react'

interface PDFViewerModalProps {
  pdfUrl: string
  fileName: string
  onClose: () => void
}

export default function PDFViewerModal({ pdfUrl, fileName, onClose }: PDFViewerModalProps) {
  // Open PDF in new window with proper mobile handling
  useEffect(() => {
    // Create proxy URL
    const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(pdfUrl)}`

    // For mobile: Use window.open with noopener for better compatibility
    // This opens the PDF in browser's native viewer
    const newWindow = window.open(proxyUrl, '_blank', 'noopener,noreferrer')

    if (!newWindow) {
      // Fallback: Direct navigation if popup blocked
      window.location.href = proxyUrl
    } else {
      // Close modal immediately since PDF opened in new context
      onClose()
    }
  }, [pdfUrl, onClose])

  // Show loading state briefly
  return (
    <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg">
        <p className="text-foreground">Opening PDF...</p>
      </div>
    </div>
  )
}
