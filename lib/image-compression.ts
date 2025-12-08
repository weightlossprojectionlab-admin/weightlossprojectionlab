'use client'

import imageCompression from 'browser-image-compression'
import { logger } from '@/lib/logger'

/**
 * Compress an image file to reduce size before upload
 * @param file - Image file to compress
 * @returns Compressed file and base64 data URL
 */
export async function compressImage(file: File): Promise<{
  compressedFile: File
  base64DataUrl: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
}> {
  const originalSize = file.size

  // Compression options - optimized for Netlify dev server limits
  const options = {
    maxSizeMB: 0.2, // Maximum file size 200KB - works with Netlify dev server
    maxWidthOrHeight: 800, // Reasonable resolution for AI analysis
    useWebWorker: false, // Disabled: Web workers can crash Netlify dev tunnel
    fileType: 'image/jpeg', // JPEG for better compatibility
    initialQuality: 0.7, // Good balance of quality and size
  }

  try {
    logger.debug(`Original image size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`)

    // Compress the image
    const compressedFile = await imageCompression(file, options)
    const compressedSize = compressedFile.size

    logger.debug(`Compressed image size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`)
    logger.debug(`Compression ratio: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}% reduction`)

    // Convert compressed file to base64 data URL
    const base64DataUrl = await imageCompression.getDataUrlFromFile(compressedFile)

    return {
      compressedFile,
      base64DataUrl,
      originalSize,
      compressedSize,
      compressionRatio: (1 - compressedSize / originalSize) * 100
    }
  } catch (error) {
    logger.error('Error compressing image', error as Error)
    throw new Error('Failed to compress image. Please try again.')
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}
