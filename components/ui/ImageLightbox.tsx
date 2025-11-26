'use client'

import { X } from 'lucide-react'

interface ImageLightboxProps {
  imageUrl: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ imageUrl, alt, onClose }: ImageLightboxProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-[61]"
        aria-label="Close lightbox"
      >
        <X className="w-6 h-6 text-gray-800 dark:text-gray-200" />
      </button>

      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
