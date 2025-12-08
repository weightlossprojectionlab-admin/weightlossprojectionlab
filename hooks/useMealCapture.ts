'use client'

import { useState, useRef } from 'react'
import { uploadMealPhoto } from '@/lib/storage-upload'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface UseMealCaptureReturn {
  // State
  capturedImage: string | null
  imageObjectUrl: string | null
  photoUrl: string | undefined
  uploading: boolean
  uploadProgress: string
  additionalPhotos: string[]
  uploadingAdditional: boolean

  // Actions
  capturePhoto: (file: File, autoAnalyze?: (imageData: string) => void) => Promise<void>
  uploadPhoto: () => Promise<string | undefined>
  clearPhoto: () => void
  handleAdditionalPhotos: (files: File[]) => Promise<void>
  removeAdditionalPhoto: (index: number) => void

  // Refs (for advanced usage)
  capturedImageRef: React.MutableRefObject<string | null>
}

/**
 * Hook for handling meal photo capture, compression, and upload
 *
 * Handles:
 * - Photo capture from camera/file input
 * - Base64 conversion for AI analysis
 * - Image compression for storage
 * - Firebase Storage upload with retry logic
 * - Additional photos (up to 4 total)
 * - CSP-compliant image processing
 * - Dev server size limits
 */
export function useMealCapture(): UseMealCaptureReturn {
  // State for captured images
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([])
  const [uploadingAdditional, setUploadingAdditional] = useState(false)

  // Ref to preserve image data across renders (React batching workaround)
  const capturedImageRef = useRef<string | null>(null)

  /**
   * Capture photo from camera/file input
   * Converts to base64 for AI analysis (NO compression)
   * Optionally triggers AI analysis callback
   */
  const capturePhoto = async (file: File, autoAnalyze?: (imageData: string) => void) => {
    try {
      logger.debug('🔄 Converting image to base64 for AI analysis...')

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file)
      setImageObjectUrl(objectUrl)

      // Convert to base64 for AI analysis (NO compression - AI needs quality)
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Data = event.target?.result as string
        logger.debug('✅ Image converted to base64, length:', { length: base64Data.length })
        setCapturedImage(base64Data)
        capturedImageRef.current = base64Data // Store in ref for persistence
        logger.debug('📸 Image stored in both state and ref')

        // Start AI analysis with high-quality image if callback provided
        if (autoAnalyze) {
          autoAnalyze(base64Data)
        }
      }
      reader.onerror = (error) => {
        logger.error('❌ FileReader error:', new Error('FileReader error'))
        toast.error('Failed to read image file')
      }
      reader.readAsDataURL(file)

    } catch (error) {
      logger.error('❌ Image capture error:', error as Error)
      toast.error('Failed to process image. Please try again.')
    }
  }

  /**
   * Upload photo to Firebase Storage
   * Handles compression, dev server limits, retry logic
   * Returns photoUrl or undefined
   */
  const uploadPhoto = async (): Promise<string | undefined> => {
    // CRITICAL: Use ref as source of truth (state may be stale due to React batching)
    const imageToUpload = capturedImageRef.current || capturedImage

    // DEBUG: Log state vs ref to diagnose state loss
    logger.debug('🔍 Image availability check:', {
      hasStateImage: !!capturedImage,
      hasRefImage: !!capturedImageRef.current,
      usingImage: !!imageToUpload,
      stateLength: capturedImage?.length || 0,
      refLength: capturedImageRef.current?.length || 0
    })

    if (!imageToUpload) {
      logger.debug('📸 No image to upload')
      return undefined
    }

    setUploading(true)
    setUploadProgress('Compressing image...')
    logger.debug('🗜️ Compressing image before upload...', {
      source: capturedImageRef.current ? 'ref' : 'state',
      imageLength: imageToUpload.length
    })

    try {
      // Convert base64 to blob for compression (without fetch to avoid CSP violation)
      const base64Data = imageToUpload.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/jpeg' })
      const file = new File([blob], 'meal-photo.jpg', { type: 'image/jpeg' })

      // Dynamically import image compression (browser-image-compression library ~30kB)
      const { compressImage } = await import('@/lib/image-compression')

      // Compress image for storage
      const compressed = await compressImage(file)
      const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
      }

      logger.debug('✅ Compressed:', {
        original: formatFileSize(compressed.originalSize),
        compressed: formatFileSize(compressed.compressedSize)
      })

      // Check if compressed size is still too large for Netlify dev server
      const maxDevSize = 50 * 1024 // 50KB limit for Netlify dev
      if (compressed.compressedSize > maxDevSize && typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
        logger.warn(`⚠️ Compressed image (${formatFileSize(compressed.compressedSize)}) exceeds Netlify dev server limit (${formatFileSize(maxDevSize)}). Skipping photo upload in development.`)
        toast.error(`Photo too large for dev server (${formatFileSize(compressed.compressedSize)}). Saving meal without photo. Deploy to production to test photo uploads.`)
        setUploading(false)
        setUploadProgress('')
        return undefined
      }

      setUploadProgress('Uploading photo...')

      // Upload compressed image with 60s timeout and retry logic
      let uploadAttempts = 0
      const maxAttempts = 2
      let uploadedUrl: string | undefined

      while (uploadAttempts < maxAttempts && !uploadedUrl) {
        try {
          uploadAttempts++
          logger.debug(`📤 Upload attempt ${uploadAttempts}/${maxAttempts}`)

          uploadedUrl = await Promise.race([
            uploadMealPhoto(compressed.base64DataUrl),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('Upload timeout after 60s')), 60000)
            )
          ])
          logger.debug('✅ Photo uploaded:', { photoUrl: uploadedUrl })
        } catch (retryError) {
          if (uploadAttempts >= maxAttempts) {
            throw retryError // Throw on final attempt
          }
          logger.warn(`⚠️ Upload attempt ${uploadAttempts} failed, retrying...`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
        }
      }

      setPhotoUrl(uploadedUrl)
      setUploading(false)
      setUploadProgress('')
      return uploadedUrl

    } catch (uploadError) {
      // Comprehensive error capture for debugging
      const errorInfo = {
        message: (uploadError as any)?.message || 'No message',
        name: (uploadError as any)?.name || 'Unknown',
        code: (uploadError as any)?.code,
        isTimeoutError: (uploadError as Error)?.message?.includes('timeout'),
        errorType: Object.prototype.toString.call(uploadError),
        errorKeys: Object.keys(uploadError || {}),
        rawError: String(uploadError)
      }

      console.error('❌ PHOTO UPLOAD FAILED - FULL ERROR:', errorInfo)
      logger.error('❌ Photo upload failed:', uploadError as Error, errorInfo)

      // Continue saving even if photo upload fails
      const displayMessage = errorInfo.isTimeoutError
        ? 'Upload timed out - please check your internet connection'
        : errorInfo.message || 'Unknown error'
      toast.error(`Photo upload failed: ${displayMessage}`)

      setUploading(false)
      setUploadProgress('')
      return undefined
    }
  }

  /**
   * Handle additional photos (up to 4 total)
   * Validates, compresses, and stores in state
   */
  const handleAdditionalPhotos = async (files: File[]) => {
    if (files.length === 0) {
      return
    }

    // Check if adding these photos would exceed limit
    const remainingSlots = 4 - additionalPhotos.length
    if (files.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more photo${remainingSlots !== 1 ? 's' : ''} (max 4 total)`)
      return
    }

    // Validate and compress each file
    setUploadingAdditional(true)
    const newPhotos: string[] = []

    try {
      for (const file of files) {
        // Validate file is an image
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`)
          continue
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`)
          continue
        }

        // Compress image using existing compression library
        const { compressImage } = await import('@/lib/image-compression')
        const compressed = await compressImage(file)

        newPhotos.push(compressed.base64DataUrl)
      }

      // Add to state
      setAdditionalPhotos(prev => [...prev, ...newPhotos])
      toast.success(`Added ${newPhotos.length} photo${newPhotos.length !== 1 ? 's' : ''}`)
    } catch (error) {
      logger.error('Failed to process additional photos:', error as Error)
      toast.error('Failed to process some photos')
    } finally {
      setUploadingAdditional(false)
    }
  }

  /**
   * Remove additional photo by index
   */
  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index))
    toast.success('Photo removed')
  }

  /**
   * Clear all captured photos and reset state
   */
  const clearPhoto = () => {
    // Clean up object URL to prevent memory leak
    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl)
      setImageObjectUrl(null)
    }

    setCapturedImage(null)
    capturedImageRef.current = null
    setPhotoUrl(undefined)
    setAdditionalPhotos([])
    setUploadProgress('')
    logger.debug('🧹 Photo state cleared')
  }

  return {
    // State
    capturedImage,
    imageObjectUrl,
    photoUrl,
    uploading,
    uploadProgress,
    additionalPhotos,
    uploadingAdditional,

    // Actions
    capturePhoto,
    uploadPhoto,
    clearPhoto,
    handleAdditionalPhotos,
    removeAdditionalPhoto,

    // Refs
    capturedImageRef
  }
}
