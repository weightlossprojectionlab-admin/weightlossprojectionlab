'use client'

import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from './firebase'
import { logger } from '@/lib/logger'

/**
 * Upload a base64 image to Firebase Storage
 * @param base64Image - Base64 encoded image string (data:image/...)
 * @param path - Storage path (e.g., 'meals/meal-123')
 * @returns Download URL of the uploaded image
 */
export async function uploadBase64Image(
  base64Image: string,
  path: string
): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Create storage reference
    const storageRef = ref(storage, `users/${user.uid}/${path}`)

    logger.debug('📤 Uploading to Firebase Storage:', { path: `users/${user.uid}/${path}` })

    // Convert base64 to Blob (File object)
    const contentTypeMatch = base64Image.match(/data:(image\/[a-zA-Z]+);base64,/)
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/jpeg'

    // Remove the data URL prefix
    const base64Data = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, '')

    // Convert base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create Blob with correct content type
    const blob = new Blob([bytes], { type: contentType })

    logger.debug('Uploading blob:', { type: contentType, size: blob.size })

    // Upload using uploadBytes (same as medication-image-upload.ts)
    await uploadBytes(storageRef, blob)

    logger.debug('✅ Upload complete, getting download URL...')

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef)

    logger.debug('✅ Download URL retrieved:', { downloadURL })

    return downloadURL
  } catch (error) {
    // Firebase Storage errors have special structure - capture everything
    const errorDetails = {
      // Standard Error properties
      message: (error as any)?.message,
      name: (error as any)?.name,
      stack: (error as any)?.stack,
      // Firebase-specific properties
      code: (error as any)?.code,
      serverResponse: (error as any)?.serverResponse,
      customData: (error as any)?.customData,
      // Raw error inspection
      errorType: Object.prototype.toString.call(error),
      errorConstructor: error?.constructor?.name,
      errorKeys: Object.keys(error || {}),
      // Full serialization attempt
      errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      // User context
      userId: user.uid,
      path: `users/${user.uid}/${path}`,
      authState: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      }
    }

    console.error('🔍 DETAILED ERROR CAPTURE:', errorDetails)
    logger.error('Error uploading image', error as Error, errorDetails)

    // Provide user-friendly error message based on error code
    const errorCode = (error as any)?.code
    if (errorCode === 'storage/unauthorized') {
      throw new Error('Storage permission denied. Please check Firebase Storage rules.')
    } else if (errorCode === 'storage/unknown') {
      throw new Error('Storage upload failed. This may be due to Firebase Storage rules. Please contact support.')
    } else {
      // Re-throw the original error to preserve details
      throw error
    }
  }
}

/**
 * Upload a meal photo and return the download URL
 * @param base64Image - Base64 encoded image
 * @returns Download URL
 */
export async function uploadMealPhoto(base64Image: string): Promise<string> {
  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const filename = `meal-${timestamp}.jpg`
  const path = `meals/${filename}`

  return uploadBase64Image(base64Image, path)
}
