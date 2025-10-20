'use client'

import imageCompression from 'browser-image-compression'

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

  // Compression options
  const options = {
    maxSizeMB: 1, // Maximum file size in MB
    maxWidthOrHeight: 1920, // Maximum width or height
    useWebWorker: true, // Use web worker for better performance
    fileType: 'image/jpeg', // Convert to JPEG for better compression
    initialQuality: 0.8, // 80% quality
  }

  try {
    console.log('📸 Original image size:', (originalSize / 1024 / 1024).toFixed(2), 'MB')

    // Compress the image
    const compressedFile = await imageCompression(file, options)
    const compressedSize = compressedFile.size

    console.log('✅ Compressed image size:', (compressedSize / 1024 / 1024).toFixed(2), 'MB')
    console.log('📊 Compression ratio:', ((1 - compressedSize / originalSize) * 100).toFixed(1), '% reduction')

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
    console.error('Error compressing image:', error)
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
